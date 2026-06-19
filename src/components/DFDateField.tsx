import { useController, type Control } from "react-hook-form";
import type { FieldValidation } from "@schema-forms-data/core";
import { Input, cn } from "@schema-forms-data/ui";

// Usa fuso local para evitar off-by-one em UTC+ após meia-noite
const toLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ageToMaxDate = (minAge: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - minAge);
  return toLocalDateString(d);
};

const ageToMinDate = (maxAge: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - maxAge);
  return toLocalDateString(d);
};

interface DFDateFieldProps {
  name: string;
  control: Control<Record<string, unknown>>;
  placeholder?: string;
  isDatetime?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  validacao?: FieldValidation;
}

const DFDateField = ({
  name,
  control,
  isDatetime,
  disabled,
  readOnly,
  validacao,
}: DFDateFieldProps) => {
  const { field, fieldState } = useController({ name, control });
  const inputType = isDatetime ? "datetime-local" : "date";
  const toInputDate = (s: string) => (isDatetime ? s + "T00:00" : s);

  const maxAttr =
    validacao?.minAge != null
      ? toInputDate(ageToMaxDate(validacao.minAge))
      : validacao?.maxDate != null
        ? toInputDate(validacao.maxDate)
        : undefined;

  const minAttr =
    validacao?.maxAge != null
      ? toInputDate(ageToMinDate(validacao.maxAge))
      : validacao?.minDate != null
        ? toInputDate(validacao.minDate)
        : undefined;

  return (
    <div className="space-y-1">
      <Input
        name={field.name}
        value={(field.value as string) ?? ""}
        onChange={field.onChange}
        onBlur={field.onBlur}
        type={inputType}
        min={minAttr}
        max={maxAttr}
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

export default DFDateField;
