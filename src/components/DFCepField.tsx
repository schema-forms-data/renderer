/**
 * DFCepField — CEP com auto-preenchimento.
 * Por padrão usa a API pública ViaCEP.
 * Se o RendererContext fornecer `cepLookup`, usa esse ao invés.
 *
 * Quais campos preencher é controlado pela prop `cepFillMap`.
 * Quando ausente, usa os nomes fixos do preset de endereço:
 *   `_address_logradouro`, `_address_bairro`, `_address_cidade`, `_address_estado`.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useController, useFormContext, type Control } from "react-hook-form";
import { useRendererContext } from "../RendererContext";
import { Input, cn } from "@schema-forms-data/ui";
import { Loader2, Check, AlertCircle } from "lucide-react";

interface CepFillMap {
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

interface DFCepFieldProps {
  name: string;
  control: Control<Record<string, unknown>>;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Mapa de nomes de campos a preencher após lookup. Quando ausente usa `_address_*`. */
  cepFillMap?: CepFillMap;
}

type FetchStatus = "idle" | "loading" | "success" | "error";

const stripMask = (v: string) => v.replace(/\D/g, "");
const applyMask = (v: string): string => {
  const d = stripMask(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

// ViaCEP fallback (API pública)
const lookupViaCep = async (cep: string, signal?: AbortSignal) => {
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });
  if (!res.ok) throw new Error("Falha ao consultar CEP");
  return res.json();
};

const DFCepField = ({
  name,
  control,
  placeholder = "00000-000",
  disabled,
  readOnly,
  cepFillMap,
}: DFCepFieldProps) => {
  const { field, fieldState } = useController({ name, control });
  const { setValue } = useFormContext<Record<string, unknown>>();
  const { cepLookup } = useRendererContext();
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    },
    [],
  );

  const handleBlur = useCallback(async () => {
    field.onBlur();
    const digits = stripMask((field.value as string) ?? "");
    if (digits.length !== 8) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStatus("loading");
    setErrorMsg(null);

    try {
      let data: {
        logradouro?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
        erro?: boolean;
      };

      if (cepLookup) {
        const controller = abortRef.current;
        data = await cepLookup(digits, controller.signal);
        // Componente desmontado ou nova requisição iniciada enquanto aguardava
        if (controller.signal.aborted || !mountedRef.current) return;
      } else {
        const raw = await lookupViaCep(digits, abortRef.current.signal);
        if (!mountedRef.current) return;
        if (raw.erro) {
          setStatus("error");
          setErrorMsg("CEP não encontrado");
          return;
        }
        data = {
          logradouro: raw.logradouro,
          bairro: raw.bairro,
          cidade: raw.localidade,
          estado: raw.uf,
        };
      }

      if (!mountedRef.current) return;
      if (data.erro) {
        setStatus("error");
        setErrorMsg("CEP não encontrado");
        return;
      }
      // Prefixo para containers repetíveis (ex: "contatos.0.cep" → "contatos.0.")
      const addrPrefix = name.includes(".")
        ? `${name.substring(0, name.lastIndexOf("."))}.`
        : "";
      // Resolve o nome de campo alvo: usa cepFillMap quando disponível, senão _address_*
      const fillField = (
        key: keyof CepFillMap,
        fallback: string,
        value: string | undefined,
      ) => {
        if (!value) return;
        const target = cepFillMap?.[key]
          ? `${addrPrefix}${cepFillMap[key]}`
          : `${addrPrefix}${fallback}`;
        setValue(target, value, { shouldDirty: true, shouldValidate: true });
      };
      fillField("logradouro", "_address_logradouro", data.logradouro);
      fillField("bairro", "_address_bairro", data.bairro);
      fillField("cidade", "_address_cidade", data.cidade);
      fillField("estado", "_address_estado", data.estado);
      setStatus("success");
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      if (!mountedRef.current) return;
      setStatus("error");
      setErrorMsg("Erro ao buscar CEP");
    }
  }, [field, cepLookup, setValue, name, cepFillMap]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      field.onChange(applyMask(e.target.value));
    },
    [field],
  );

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          name={field.name}
          value={(field.value as string) || ""}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            "pr-9",
            fieldState.error &&
              "border-destructive focus-visible:ring-destructive",
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {status === "loading" && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {status === "success" && <Check className="h-4 w-4 text-green-500" />}
          {status === "error" && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>
      {(fieldState.error?.message || errorMsg) && (
        <p className="text-sm text-destructive">
          {fieldState.error?.message || errorMsg}
        </p>
      )}
    </div>
  );
};

export default DFCepField;
