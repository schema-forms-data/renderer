import { useController, type Control } from "react-hook-form";
import { Checkbox } from "@schema-forms-data/ui";

interface DFCheckboxProps {
  name: string;
  control: Control<Record<string, unknown>>;
  label?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const DFCheckbox = ({
  name,
  control,
  label,
  disabled,
  readOnly,
}: DFCheckboxProps) => {
  const { field, fieldState } = useController({ name, control });
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          name={field.name}
          checked={!!field.value}
          onCheckedChange={(checked) => !readOnly && field.onChange(!!checked)}
          onBlur={field.onBlur}
          disabled={disabled}
        />
        {label && <span className="text-sm leading-none">{label}</span>}
      </label>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFCheckbox;
