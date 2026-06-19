import { useController, type Control } from "react-hook-form";
import type { FieldOption } from "@schema-forms-data/core";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  cn,
} from "@schema-forms-data/ui";

interface DFSelectProps {
  name: string;
  control: Control<Record<string, unknown>>;
  placeholder?: string;
  options: FieldOption[];
  disabled?: boolean;
  readOnly?: boolean;
}

const DFSelect = ({
  name,
  control,
  placeholder,
  options,
  disabled,
  readOnly,
}: DFSelectProps) => {
  const { field, fieldState } = useController({ name, control });
  return (
    <div className="space-y-1">
      <Select
        value={(field.value as string) ?? ""}
        onValueChange={(val) => !readOnly && field.onChange(val)}
        disabled={disabled || readOnly}
      >
        <SelectTrigger
          className={cn(fieldState.error && "border-destructive focus:ring-destructive")}
          onBlur={field.onBlur}
        >
          <SelectValue placeholder={placeholder ?? "Selecione..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.valor} value={opt.valor} disabled={opt.disabled}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFSelect;
