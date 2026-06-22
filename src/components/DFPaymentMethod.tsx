/**
 * DFPaymentMethod — Seleção de forma de pagamento com cards clicáveis.
 *
 * > **Implementação de referência** baseada no modelo de inscrição de acampamentos IPB.
 * > Para customizar as opções de pagamento sem substituir o componente,
 * > passe `paymentMethodOptions` no `RendererContext` (ou em `FormRenderer`).
 * > Para substituir completamente, use `componentMapper[FieldType.PAYMENT_METHOD]`.
 *
 * Observa o campo de tipo de participação (default `"tipo_participacao"`) via `useWatch`
 * e lê `valor`/`valorPorDia` de `externalData` do contexto.
 *
 * **Opções padrão:**
 * - Por dia: PIX, Dinheiro, Cartão de Crédito (3,15%)
 * - Todos os dias: PIX à Vista, PIX Parcelado (7x), Cartão (12,40% / 12x), Dinheiro
 *
 * Valor armazenado: `{ metodo: string, parcelas?: number, valorTotal: number }`
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useController, useWatch, type Control } from "react-hook-form";
import {
  Smartphone,
  Banknote,
  CreditCard,
  Gift,
  Info,
  Loader2,
  Paperclip,
  Check,
  X,
} from "lucide-react";
import { useRendererContext } from "../RendererContext";
import type { PaymentOption } from "../RendererContext";
import { cn } from "@schema-forms-data/ui";

interface ParticipationValue {
  /** novo contrato */
  escopo?: "evento" | "dias" | null;
  dias?: string[];
  tipo?: string | null;
  genero?: string | null;
  /** legado */
  data?: string | null;
}

export interface PaymentMethodValue {
  metodo: string;
  parcelas?: number;
  valorTotal: number;
  /**
   * uploadId do comprovante de pagamento (contexto INSCRICAO, campo reservado
   * `comprovante`). Preenchido quando o evento exige comprovante e o método é PIX.
   * O backend o liga à 1ª parcela em `criarParaInscricao`.
   */
  comprovante?: string;
}

/** Campo reservado aceito pela rota pública de upload de inscrição. */
const CAMPO_COMPROVANTE = "comprovante";
const COMPROVANTE_MAX_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Métodos que exigem comprovante quando o evento configura `exigeComprovante`.
 * Espelha o backend (`METODOS_COM_COMPROVANTE` = pix à vista / parcelado).
 * Robusto aos dois conjuntos de ids: `pix`/`pix_avista`/`pix_parcelado`.
 */
const metodoExigeComprovante = (metodo?: string | null): boolean =>
  !!metodo && metodo.startsWith("pix");

export interface DFPaymentMethodProps {
  name: string;
  control: Control<Record<string, unknown>>;
  /** Nome do campo de tipo de participação a ser observado. Padrão: `"tipo_participacao"`. */
  relatedFieldName?: string;
}

const TAXA_CARTAO_DIA = 0.0315;
const TAXA_CARTAO_TODOS = 0.124;
const PARCELAS_PIX = 7;
const PARCELAS_CARTAO_TODOS = 12;

/**
 * Opções de pagamento padrão para participação por dia (IPB).
 * Use como base ao customizar via `paymentMethodOptions.porDia`.
 */
export const OPCOES_POR_DIA: PaymentOption[] = [
  {
    id: "pix",
    label: "PIX",
    description: "Transferência instantânea (à vista)",
    Icon: Smartphone,
    taxa: 0,
  },
  {
    id: "dinheiro",
    label: "Dinheiro",
    description: "Pagamento em espécie",
    Icon: Banknote,
    taxa: 0,
  },
  {
    id: "cartao",
    label: "Cartão de Crédito",
    description: "Débito ou crédito na maquininha",
    Icon: CreditCard,
    taxa: TAXA_CARTAO_DIA,
    taxaLabel: `Taxa: ${(TAXA_CARTAO_DIA * 100).toFixed(2).replace(".", ",")}%`,
  },
];

/**
 * Opções de pagamento padrão para participação em todos os dias (IPB).
 * Use como base ao customizar via `paymentMethodOptions.todosOsDias`.
 */
export const OPCOES_TODOS_OS_DIAS: PaymentOption[] = [
  {
    id: "pix",
    label: "PIX à Vista",
    description: "Pagamento instantâneo sem parcelamento",
    Icon: Smartphone,
    taxa: 0,
  },
  {
    id: "pix_parcelado",
    label: "PIX Parcelado",
    description: `Parcelado em até ${PARCELAS_PIX}x sem juros`,
    Icon: Smartphone,
    taxa: 0,
    parcelas: PARCELAS_PIX,
  },
  {
    id: "cartao",
    label: "Cartão de Crédito",
    description: `Parcelado em até ${PARCELAS_CARTAO_TODOS}x`,
    Icon: CreditCard,
    taxa: TAXA_CARTAO_TODOS,
    parcelas: PARCELAS_CARTAO_TODOS,
    taxaLabel: `Taxa: ${(TAXA_CARTAO_TODOS * 100).toFixed(2).replace(".", ",")}%`,
  },
  {
    id: "dinheiro",
    label: "Dinheiro",
    description: "Pagamento em espécie",
    Icon: Banknote,
    taxa: 0,
  },
];

/**
 * Metadados por forma de pagamento (chaveado pelo valor do backend:
 * `pix_avista | pix_parcelado | dinheiro | cartao | isento`). Usado quando o
 * evento informa `formasPagamentoDisponiveis` — aí o seletor mostra **só** o que
 * o admin habilitou. Sem taxa/checkout: gateway de cartão é Fase futura; aqui
 * o pagamento é confirmado pela organização (manual).
 */
const FORMA_PAGAMENTO_META: Record<
  string,
  { label: string; description: string; Icon: typeof Smartphone; parcelavel?: boolean; isento?: boolean }
> = {
  pix_avista: {
    label: "PIX à vista",
    description: "Pagamento instantâneo via Pix",
    Icon: Smartphone,
  },
  pix_parcelado: {
    label: "PIX Parcelado",
    description: "Parcelado no Pix, sem juros",
    Icon: Smartphone,
    parcelavel: true,
  },
  dinheiro: {
    label: "Dinheiro",
    description: "Pagamento em espécie",
    Icon: Banknote,
  },
  cartao: {
    label: "Cartão",
    description: "Na maquininha (presencial)",
    Icon: CreditCard,
  },
  isento: {
    label: "Isento",
    description: "Sem cobrança",
    Icon: Gift,
    isento: true,
  },
};

const formatCurrency = (centavos: number): string =>
  `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;

const calcularValorTotal = (valorBase: number, taxa: number): number =>
  Math.round(valorBase * (1 + taxa) * 100) / 100;

const calcularParcela = (valorTotal: number, parcelas: number): number =>
  Math.round((valorTotal / parcelas) * 100) / 100;

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Uploader do comprovante embutido no DFPaymentMethod. Grava o uploadId no
 * valor do campo `payment_method` (`.comprovante`) — não num campo próprio do
 * form — usando `uploadFile`/`deleteUploadedFile` do RendererContext com o
 * campo reservado `comprovante`.
 */
const ComprovanteUpload = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (uploadId: string | null) => void;
}) => {
  const { uploadFile, deleteUploadedFile, onUploadStart, onUploadEnd } =
    useRendererContext();
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "uploading"; fileName: string; progress: number }
    | { status: "done"; fileName: string }
    | { status: "error"; message: string }
  >(value ? { status: "done", fileName: "Comprovante enviado" } : { status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const processFile = useCallback(
    async (file: File) => {
      if (file.size > COMPROVANTE_MAX_BYTES) {
        setState({
          status: "error",
          message: `Arquivo muito grande. Máximo: ${formatSize(COMPROVANTE_MAX_BYTES)}`,
        });
        return;
      }
      const isImageOrPdf =
        file.type.startsWith("image/") || file.type === "application/pdf";
      if (file.type && !isImageOrPdf) {
        setState({ status: "error", message: "Envie uma imagem ou PDF." });
        return;
      }
      if (!uploadFile) {
        setState({
          status: "error",
          message: "Preview: upload não disponível sem configuração.",
        });
        return;
      }
      setState({ status: "uploading", fileName: file.name, progress: 0 });
      onUploadStart?.();
      try {
        if (value && deleteUploadedFile) {
          try {
            await deleteUploadedFile(value);
          } catch {
            /* ignora erro de delete para não bloquear o novo upload */
          }
        }
        const uploadId = await uploadFile(file, CAMPO_COMPROVANTE, (percent) => {
          if (!mountedRef.current) return;
          setState((prev) =>
            prev.status === "uploading"
              ? { ...prev, progress: Math.min(100, percent) }
              : prev,
          );
        });
        if (!mountedRef.current) return;
        onChange(uploadId);
        setState({ status: "done", fileName: file.name });
      } catch {
        if (!mountedRef.current) return;
        setState({
          status: "error",
          message: "Falha no upload. Tente novamente.",
        });
      } finally {
        if (mountedRef.current) onUploadEnd?.();
      }
    },
    [uploadFile, deleteUploadedFile, value, onChange, onUploadStart, onUploadEnd],
  );

  const handleRemove = () => {
    if (value && deleteUploadedFile) {
      onUploadStart?.();
      deleteUploadedFile(value)
        .catch(() => {})
        .finally(() => onUploadEnd?.());
    }
    onChange(null);
    setState({ status: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const isDone = state.status === "done" || (state.status === "idle" && !!value);

  if (isDone) {
    const fileName =
      state.status === "done" ? state.fileName : "Comprovante enviado";
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500 bg-green-500/5 px-3 py-2.5">
        <Check className="h-4 w-4 shrink-0 text-green-600" />
        <span className="flex-1 truncate text-sm font-medium">{fileName}</span>
        <button
          type="button"
          onClick={handleRemove}
          className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
          aria-label="Remover comprovante"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (state.status === "uploading") {
    return (
      <div className="space-y-2 rounded-lg border border-input px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 truncate text-sm">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            {state.fileName}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            {state.progress}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-200"
            style={{ width: `${state.progress}%` }}
          />
        </div>
      </div>
    );
  }

  const isError = state.status === "error";
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={!isError ? { borderColor: "var(--t-border)" } : undefined}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-4 text-sm transition-colors",
          isError
            ? "border-destructive bg-destructive/5 text-destructive"
            : "text-muted-foreground hover:border-primary/50 hover:bg-muted/20",
        )}
      >
        <Paperclip className="h-4 w-4" />
        Anexar comprovante (imagem ou PDF)
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processFile(f);
          e.target.value = "";
        }}
      />
      {isError && (
        <p className="text-xs text-destructive">
          {(state as { message: string }).message}
        </p>
      )}
    </div>
  );
};

const DFPaymentMethod = ({
  name,
  control,
  relatedFieldName,
}: DFPaymentMethodProps) => {
  const { field, fieldState } = useController({ name, control });
  const { externalData = {}, paymentMethodOptions, participationFieldName } =
    useRendererContext();
  const current = (field.value as PaymentMethodValue | null) ?? null;
  const errorMsg = fieldState.error?.message;

  // Observa o campo de participação. Prioridade: prop explícita → campo detectado
  // pelo FormRenderer no schema → convenção "tipo_participacao".
  const relatedName =
    relatedFieldName ?? participationFieldName ?? "tipo_participacao";
  const participacaoRaw = useWatch({ control, name: relatedName }) as
    | ParticipationValue
    | null
    | undefined;
  // "por dia" no contrato novo = escopo 'dias' (com fallback ao legado 'por_dia')
  const isPorDia =
    participacaoRaw?.escopo === "dias" || participacaoRaw?.tipo === "por_dia";

  const get = (key: string): string | undefined =>
    (externalData[`evento.${key}`] as string | undefined) ??
    (externalData[key] as string | undefined);
  const getRaw = (key: string): unknown =>
    externalData[`evento.${key}`] ?? externalData[key];

  const valor = Number(get("valor") ?? 0);
  // Valor que a participação escolhida implica — espelha o DFParticipationType e
  // o backend: por dia = soma dos dias escolhidos (preço do dia, ou do evento como
  // fallback); evento inteiro = evento.valor. NÃO usa mais `valorPorDia` (legado).
  const diasEvento =
    (getRaw("dias") as Array<{ id: string; valor?: number | null }> | undefined) ??
    [];
  const diasSelecionados = participacaoRaw?.dias ?? [];
  const valorBase = isPorDia
    ? diasSelecionados.reduce((soma, id) => {
        const dia = diasEvento.find((d) => d.id === id);
        return soma + (dia ? (dia.valor ?? valor) : 0);
      }, 0)
    : valor;

  // Formas habilitadas no evento (config do admin). Quando presentes, mandam:
  // mostra SÓ o que foi habilitado e respeita o máximo de parcelas.
  const formasHabilitadas = (
    (getRaw("formasPagamentoDisponiveis") as string[] | undefined) ?? []
  ).filter((f): f is string => typeof f === "string");
  const parcelasMax = Math.max(1, Number(getRaw("parcelasMax") ?? 0) || 1);
  const exigeComprovante = !!getRaw("exigeComprovante");

  const opcoesDoEvento: PaymentOption[] = formasHabilitadas
    .map((forma) => {
      const meta = FORMA_PAGAMENTO_META[forma];
      if (!meta) return null;
      const parcelas =
        meta.parcelavel && parcelasMax > 1 ? parcelasMax : undefined;
      return {
        id: forma,
        label: meta.label,
        description: parcelas
          ? `Parcelado em até ${parcelas}x sem juros`
          : meta.description,
        Icon: meta.Icon,
        taxa: 0, // sem taxa/checkout nesta fase (gateway é fase futura)
        ...(parcelas ? { parcelas } : {}),
      } as PaymentOption;
    })
    .filter((o): o is PaymentOption => o !== null);

  // A config do evento manda; sem ela, cai no contexto/default (compat outros projetos).
  const opcoes =
    opcoesDoEvento.length > 0
      ? opcoesDoEvento
      : isPorDia
        ? (paymentMethodOptions?.porDia ?? OPCOES_POR_DIA)
        : (paymentMethodOptions?.todosOsDias ?? OPCOES_TODOS_OS_DIAS);

  const tipoLabel = isPorDia
    ? `${participacaoRaw?.dias?.length ?? 0} dia(s) selecionado(s)`
    : "Evento inteiro";

  const selecionarMetodo = (opcao: PaymentOption) => {
    if (opcao.disabled) return;
    const valorTotal = calcularValorTotal(valorBase, opcao.taxa);
    const update: PaymentMethodValue = { metodo: opcao.id, valorTotal };
    if (opcao.parcelas) update.parcelas = opcao.parcelas;
    // Preserva o comprovante só se o novo método ainda o exige; senão descarta.
    if (metodoExigeComprovante(opcao.id) && current?.comprovante) {
      update.comprovante = current.comprovante;
    }
    field.onChange(update);
  };

  // Mostra o uploader quando o evento exige comprovante e o método escolhido é PIX.
  const mostrarComprovante =
    exigeComprovante && metodoExigeComprovante(current?.metodo);

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div
        className="flex items-center justify-between rounded-xl border px-4 py-3"
        style={{ borderColor: "var(--t-border)" }}
      >
        <div>
          <p className="text-xs text-muted-foreground">Tipo de participação</p>
          <p className="font-semibold">{tipoLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Valor base</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(valorBase)}
          </p>
        </div>
      </div>

      {/* Aviso */}
      <div
        className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2.5"
        style={{ borderColor: "var(--t-border)" }}
      >
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-xs">
          <span className="font-bold">Como funciona:</span> ao concluir, sua
          vaga já fica <span className="font-medium">garantida</span>. O
          pagamento é confirmado pela organização — você só escolhe a forma aqui.
        </p>
      </div>

      <p className="text-sm font-semibold text-primary">
        Selecione a forma de pagamento:
      </p>

      {/* Cards */}
      <div className="space-y-3">
        {opcoes.map((opcao) => {
          const { Icon } = opcao;
          const selecionado = current?.metodo === opcao.id;
          const valorTotal = calcularValorTotal(valorBase, opcao.taxa);
          const temParcelas = !!opcao.parcelas && opcao.parcelas > 1;
          const valorParcela = temParcelas
            ? calcularParcela(valorTotal, opcao.parcelas!)
            : null;

          return (
            <button
              key={opcao.id}
              type="button"
              disabled={opcao.disabled}
              onClick={() => selecionarMetodo(opcao)}
              style={
                !selecionado ? { borderColor: "var(--t-border)" } : undefined
              }
              className={cn(
                "w-full text-left flex items-center gap-4 px-4 py-3 rounded-xl border-2 transition-all",
                selecionado
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50",
                opcao.disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors",
                  selecionado
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">
                  {opcao.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {opcao.description}
                </p>
                {opcao.taxaLabel && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    * {opcao.taxaLabel}
                  </p>
                )}
                {opcao.taxa > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Total com taxa: {formatCurrency(valorTotal)}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                {opcao.id === "isento" ? (
                  <p className="text-base font-bold text-primary">Grátis</p>
                ) : temParcelas ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {opcao.parcelas}x de
                    </p>
                    <p className="text-base font-bold text-primary">
                      {formatCurrency(valorParcela!)}
                    </p>
                  </>
                ) : (
                  <p className="text-base font-bold text-primary">
                    {formatCurrency(valorTotal)}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Comprovante (quando o evento exige e o método é PIX) */}
      {mostrarComprovante && (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-primary">
            Comprovante de pagamento
          </p>
          <p className="text-xs text-muted-foreground">
            Anexe o comprovante do Pix para concluir. A organização confirma
            depois.
          </p>
          <ComprovanteUpload
            value={current?.comprovante ?? null}
            onChange={(uploadId) =>
              field.onChange({
                ...(current ?? { metodo: "", valorTotal: valorBase }),
                comprovante: uploadId ?? undefined,
              } as PaymentMethodValue)
            }
          />
        </div>
      )}

      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
    </div>
  );
};

export default DFPaymentMethod;
