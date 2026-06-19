import { useController, type Control } from "react-hook-form";
import type { FieldOption } from "@schema-forms-data/core";
import { Checkbox } from "@schema-forms-data/ui";

interface DFCheckboxGroupProps {
  name: string;
  control: Control<Record<string, unknown>>;
  options: FieldOption[];
  disabled?: boolean;
}

const DFCheckboxGroup = ({
  name,
  control,
  options,
  disabled,
}: DFCheckboxGroupProps) => {
  const { field, fieldState } = useController({ name, control });
  const selected: string[] = Array.isArray(field.value)
    ? (field.value as string[])
    : [];

  const toggle = (valor: string) => {
    const next = selected.includes(valor)
      ? selected.filter((v) => v !== valor)
      : [...selected, valor];
    field.onChange(next);
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-col gap-2" onBlur={field.onBlur}>
        {options.map((opt) => (
          <label
            key={opt.valor}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Checkbox
              checked={selected.includes(opt.valor)}
              onCheckedChange={() => toggle(opt.valor)}
              disabled={disabled || opt.disabled}
            />
            <span className="text-sm leading-none">{opt.label}</span>
          </label>
        ))}
      </div>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFCheckboxGroup;
