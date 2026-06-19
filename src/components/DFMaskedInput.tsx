import { useCallback } from "react";
import { useController, type Control } from "react-hook-form";
import { Input, cn } from "@schema-forms-data/ui";

interface DFMaskedInputProps {
  name: string;
  control: Control<Record<string, unknown>>;
  placeholder?: string;
  maskType?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const MASKS: Record<string, (v: string) => string> = {
  cpf: (v) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  },
  telefone: (v) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10)
      return d
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  },
  cep: (v) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.replace(/(\d{5})(\d)/, "$1-$2");
  },
};

const DFMaskedInput = ({
  name,
  control,
  placeholder,
  maskType,
  disabled,
  readOnly,
}: DFMaskedInputProps) => {
  const { field, fieldState } = useController({ name, control });
  const maskFn = MASKS[maskType || ""];

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      field.onChange(maskFn ? maskFn(e.target.value) : e.target.value);
    },
    [field, maskFn],
  );

  return (
    <div className="space-y-1">
      <Input
        name={field.name}
        value={(field.value as string) || ""}
        onChange={handleChange}
        onBlur={field.onBlur}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(
          fieldState.error &&
            "border-destructive focus-visible:ring-destructive",
        )}
      />
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFMaskedInput;
