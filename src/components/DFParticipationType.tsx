/**
 * DFParticipationType — Seleção de participação (modo × dias × gênero).
 *
 * > **Implementação de referência** para eventos com inscrição por dia / acampamentos.
 *
 * Lê do `externalData` do `RendererContext` (aceita `evento.X` ou `X`):
 * - `dias`: `Array<{ id, data, ordem?, valor? }>` — dias reais do evento
 * - `controlaDias`: boolean — habilita escolha de dias
 * - `controlaGenero`: boolean — habilita escolha de gênero
 * - `vagaTipos`: `string[]` — tipos ofertados (`pernoite`/`diurno`); ausente = `geral`
 * - `valor`: centavos (preço base do evento)
 * - `tipoConfig`: `Record<tipo, { label?, descricao? }>` — rótulos custom por evento (opcional)
 *
 * **Escopo derivado do tipo (binding `tipo → escopo → fonte de preço`):**
 * - `pernoite` → `escopo='evento'` → **preço fixo** do passe completo (`evento.valor`),
 *   ocupa o evento inteiro (não escolhe dias).
 * - `diurno`   → `escopo='dias'`   → escolhe os dias; total = soma dos dias selecionados.
 * - `geral`    → segue `controlaDias` (`true`=dias, `false`=evento) — comportamento clássico.
 *
 * Para dias, cada dia vale `dia.valor`, e se o dia não tiver preço próprio cai no
 * `evento.valor` (= "todos os dias, mesmo valor"). A etiqueta de cada dia mostra esse
 * mesmo preço efetivo, pra bater com o total.
 *
 * **Valor armazenado (contrato com o backend):**
 * ```ts
 * { escopo: 'evento' | 'dias', dias: string[], tipo: 'pernoite'|'diurno'|'geral', genero: 'M'|'F'|null }
 * ```
 */

import { useEffect, useRef } from "react";
import { useController, type Control } from "react-hook-form";
import {
  CalendarCheck,
  CheckCircle2,
  Info,
  Moon,
  Sun,
} from "lucide-react";
import { useRendererContext } from "../RendererContext";
import { cn } from "@schema-forms-data/ui";

export interface ParticipationValue {
  escopo: "evento" | "dias" | null;
  /** ids dos `evento_dias` selecionados (quando escopo='dias') */
  dias: string[];
  tipo: "pernoite" | "diurno" | "geral";
  genero: "M" | "F" | null;
}

interface EventoDia {
  id: string;
  data: string; // YYYY-MM-DD
  ordem?: number;
  valor?: number | null;
}

type TipoComOferta = "pernoite" | "diurno";

interface TipoLabelOverride {
  label?: string;
  descricao?: string;
}

export interface DFParticipationTypeProps {
  name: string;
  control: Control<Record<string, unknown>>;
}

const formatCurrency = (centavos: number): string =>
  `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;

/** "2026-05-20" → "20/05 - Segunda-feira" */
const formatarDia = (iso: string): string => {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
  return `${dd}/${mm} - ${weekday.charAt(0).toUpperCase() + weekday.slice(1)}`;
};

/** "2026-05-20" → "20/05" (curto, pra chips) */
const formatarDiaCurto = (iso: string): string => iso.slice(8, 10) + "/" + iso.slice(5, 7);

/** Defaults dos tipos ofertados — sobrescrevíveis por evento via `tipoConfig`. */
const TIPO_META: Record<
  TipoComOferta,
  { label: string; descricao: string; Icon: typeof Moon }
> = {
  pernoite: {
    label: "Pernoite",
    descricao: "Evento inteiro, com hospedagem",
    Icon: Moon,
  },
  diurno: {
    label: "Passar o dia",
    descricao: "Escolha os dias que vai participar",
    Icon: Sun,
  },
};

/**
 * Escopo derivado do tipo selecionado (não de `controlaDias`):
 * pernoite = passe completo (evento inteiro, preço fixo); diurno = por dia;
 * geral = segue `controlaDias` (comportamento clássico, sem distinção de tipo).
 */
const escopoDoTipo = (
  tipo: ParticipationValue["tipo"],
  controlaDias: boolean,
): "evento" | "dias" =>
  tipo === "pernoite"
    ? "evento"
    : tipo === "diurno"
      ? "dias"
      : controlaDias
        ? "dias"
        : "evento";

const DFParticipationType = ({ name, control }: DFParticipationTypeProps) => {
  const { field, fieldState } = useController({ name, control });
  const { externalData = {} } = useRendererContext();
  const errorMsg = fieldState.error?.message;
  const current = (field.value as ParticipationValue | null) ?? null;

  const getRaw = (key: string): unknown =>
    externalData[`evento.${key}`] ?? externalData[key];

  const dias = (getRaw("dias") as EventoDia[] | undefined) ?? [];
  const controlaDias = !!getRaw("controlaDias") && dias.length > 0;
  const controlaGenero = !!getRaw("controlaGenero");
  const vagaTipos = ((getRaw("vagaTipos") as string[] | undefined) ?? []).filter(
    (t): t is TipoComOferta => t === "pernoite" || t === "diurno",
  );
  const temTipo = vagaTipos.length > 0;
  const valorEvento = Number(getRaw("valor") ?? 0);
  const tipoConfig =
    (getRaw("tipoConfig") as Record<string, TipoLabelOverride> | undefined) ?? {};

  const diasSel = current?.dias ?? [];

  // Tipo efetivo: quando há tipos ofertados, ele PRECISA ser um deles. Se o
  // valor salvo não estiver entre os ofertados (ex.: o admin trocou os tipos
  // depois da inscrição começar), escolhe o que preserva a intenção — se a
  // pessoa tinha dias/escopo de dias, prefere um tipo "por dia"; senão, o de
  // evento inteiro. Assim nunca fica sem nenhum card selecionado.
  const tipoSalvoValido =
    !!current?.tipo &&
    (!temTipo || vagaTipos.includes(current.tipo as TipoComOferta));
  const resolverTipoEfetivo = (): ParticipationValue["tipo"] => {
    if (!temTipo) return current?.tipo ?? "geral";
    if (tipoSalvoValido) return current!.tipo;
    const querDias =
      current?.escopo === "dias" || (current?.dias?.length ?? 0) > 0;
    const porDia = vagaTipos.find((t) => escopoDoTipo(t, controlaDias) === "dias");
    const eventoInteiro = vagaTipos.find(
      (t) => escopoDoTipo(t, controlaDias) === "evento",
    );
    return (
      (querDias ? (porDia ?? eventoInteiro) : (eventoInteiro ?? porDia)) ??
      vagaTipos[0]
    );
  };
  const tipoSel = resolverTipoEfetivo();
  const generoSel = current?.genero ?? null;

  // Escopo resultante do tipo selecionado + se há dias reais para escolher.
  const escopoSel = escopoDoTipo(tipoSel, controlaDias);
  const selecionaDias = escopoSel === "dias" && dias.length > 0;

  // Baseline: garante um valor válido mesmo antes de qualquer interação.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || field.value != null) return;
    initRef.current = true;
    const tipo: ParticipationValue["tipo"] = temTipo ? vagaTipos[0] : "geral";
    field.onChange({
      escopo: escopoDoTipo(tipo, controlaDias),
      dias: [],
      tipo,
      genero: null,
    } as ParticipationValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlaDias, temTipo]);

  // Cura o valor salvo quando os tipos ofertados mudaram (config do admin) e o
  // tipo guardado deixou de existir — reemite com um tipo válido pra um card
  // sempre ficar selecionado e o conteúdo (dias × evento) bater.
  useEffect(() => {
    if (!temTipo || field.value == null) return;
    const v = field.value as ParticipationValue;
    if (v.tipo && vagaTipos.includes(v.tipo as TipoComOferta)) return; // já válido
    const tipo = resolverTipoEfetivo();
    const escopo = escopoDoTipo(tipo, controlaDias);
    const usaDias = escopo === "dias" && dias.length > 0;
    field.onChange({
      escopo,
      dias: usaDias ? (v.dias ?? []) : [],
      tipo,
      genero: controlaGenero ? (v.genero ?? null) : null,
    } as ParticipationValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temTipo, vagaTipos.join("|")]);

  const emit = (next: Partial<ParticipationValue>) => {
    // O tipo manda no escopo; recalcula o escopo a cada mudança de tipo.
    const tipo: ParticipationValue["tipo"] = !temTipo
      ? "geral"
      : (next.tipo ?? current?.tipo ?? vagaTipos[0]);
    const escopo = escopoDoTipo(tipo, controlaDias);
    const usaDias = escopo === "dias" && dias.length > 0;
    field.onChange({
      escopo,
      dias: usaDias ? (next.dias ?? current?.dias ?? []) : [],
      tipo,
      genero: controlaGenero ? (next.genero ?? current?.genero ?? null) : null,
    } as ParticipationValue);
  };

  const toggleDia = (id: string) => {
    const set = new Set(diasSel);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    emit({ dias: [...set] });
  };

  const todosSelecionados = dias.length > 0 && diasSel.length === dias.length;
  const toggleTodosDias = () =>
    emit({ dias: todosSelecionados ? [] : dias.map((d) => d.id) });

  // Preço efetivo de um dia: o do próprio dia, ou o do evento como fallback
  // ("todos os dias, mesmo valor"). Fonte única — usado no total e na etiqueta.
  const precoDia = (dia: EventoDia): number => dia.valor ?? valorEvento;

  // Dica de preço no card "por dia": "R$ X/dia" (uniforme) ou "a partir de R$ X/dia".
  const precosDia = dias.map(precoDia).filter((v) => v > 0);
  const precoMinDia = precosDia.length ? Math.min(...precosDia) : valorEvento;
  const precoUniforme = precosDia.every((v) => v === precosDia[0]);

  const valorTotal = selecionaDias
    ? diasSel.reduce((s, id) => {
        const dia = dias.find((d) => d.id === id);
        return s + (dia ? precoDia(dia) : 0);
      }, 0)
    : valorEvento;

  const metaTipo = (t: TipoComOferta) => ({
    ...TIPO_META[t],
    ...tipoConfig[t],
  });

  const tituloClasse =
    "mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* ── Gênero ─────────────────────────────────────────────────────── */}
      {controlaGenero && (
        <div>
          <p className={tituloClasse}>Você é</p>
          <div className="grid grid-cols-2 gap-2">
            {(["M", "F"] as const).map((g) => {
              const sel = generoSel === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => emit({ genero: g })}
                  style={!sel ? { borderColor: "var(--t-border)" } : undefined}
                  className={cn(
                    "rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all",
                    sel
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {g === "M" ? "Masculino" : "Feminino"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modo de participação ───────────────────────────────────────
          Só mostra o seletor quando há 2+ opções reais. Um único tipo não
          vira um card solitário — o conteúdo abaixo já deixa o modo claro. */}
      {vagaTipos.length >= 2 && (
        <div>
          <p className={tituloClasse}>Como você vai participar</p>
          <div className="grid grid-cols-2 gap-2">
            {vagaTipos.map((t) => {
              const meta = metaTipo(t);
              const Icon = meta.Icon;
              const sel = tipoSel === t;
              const ehEvento = escopoDoTipo(t, controlaDias) === "evento";
              const dica = ehEvento
                ? `${formatCurrency(valorEvento)} · tudo incluído`
                : precoUniforme
                  ? `${formatCurrency(precoMinDia)} / dia`
                  : `a partir de ${formatCurrency(precoMinDia)} / dia`;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => emit({ tipo: t })}
                  style={!sel ? { borderColor: "var(--t-border)" } : undefined}
                  className={cn(
                    "relative flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all",
                    sel
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        sel
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {sel && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="text-sm font-semibold">{meta.label}</span>
                  <span className="text-xs leading-snug text-muted-foreground">
                    {meta.descricao}
                  </span>
                  {(valorEvento > 0 || precoMinDia > 0) && (
                    <span className="mt-0.5 text-xs font-medium text-primary">
                      {dica}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Conteúdo conforme o modo escolhido ─────────────────────────── */}
      {selecionaDias ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className={cn(tituloClasse, "mb-0 text-primary")}>
              Selecione os dias
            </p>
            <button
              type="button"
              onClick={toggleTodosDias}
              className="text-xs font-medium text-primary hover:underline"
            >
              {todosSelecionados ? "Limpar" : "Selecionar todos"}
            </button>
          </div>
          {dias.map((dia) => {
            const sel = diasSel.includes(dia.id);
            return (
              <button
                key={dia.id}
                type="button"
                onClick={() => toggleDia(dia.id)}
                style={!sel ? { borderColor: "var(--t-border)" } : undefined}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 text-left transition-all",
                  sel ? "border-primary bg-primary/5" : "hover:border-primary/50",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                      sel ? "border-primary bg-primary" : "",
                    )}
                    style={!sel ? { borderColor: "var(--t-border)" } : undefined}
                  >
                    {sel && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </span>
                  <span className="text-sm">{formatarDia(dia.data)}</span>
                </div>
                {precoDia(dia) > 0 && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      sel ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {formatCurrency(precoDia(dia))}
                  </span>
                )}
              </button>
            );
          })}
          {diasSel.length === 0 && (
            <p className="flex items-center gap-1.5 px-1 text-xs text-amber-600">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Escolha pelo menos um dia para continuar.
            </p>
          )}
        </div>
      ) : (
        // Modo "evento inteiro": deixa claro que cobre tudo (não é um vazio).
        <div className="space-y-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold text-primary">
                {vagaTipos.length === 1
                  ? `${metaTipo(vagaTipos[0]).label} — evento inteiro`
                  : "Evento inteiro incluído"}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {dias.length > 0
                  ? `Você participa de todos os ${dias.length} dia(s) por um valor único — não precisa escolher dia.`
                  : "Sua inscrição cobre o evento inteiro."}
              </p>
            </div>
          </div>
          {dias.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dias.map((dia) => (
                <span
                  key={dia.id}
                  className="rounded-md border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  style={{ borderColor: "var(--t-border)" }}
                >
                  {formatarDiaCurto(dia.data)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Total ──────────────────────────────────────────────────────── */}
      {valorTotal > 0 && (
        <div className="flex items-center justify-between rounded-xl border-2 border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-xs font-medium text-muted-foreground">
            {selecionaDias
              ? `${diasSel.length} dia(s) selecionado(s)`
              : "Evento inteiro"}
          </span>
          <div className="text-right">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Total
            </span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(valorTotal)}
            </span>
          </div>
        </div>
      )}

      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
    </div>
  );
};

export default DFParticipationType;
