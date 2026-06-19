import { useController, type Control } from "react-hook-form";
import { Switch } from "@schema-forms-data/ui";

interface DFSwitchProps {
  name: string;
  control: Control<Record<string, unknown>>;
  label: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const DFSwitch = ({
  name,
  control,
  label,
  disabled,
  readOnly,
}: DFSwitchProps) => {
  const { field, fieldState } = useController({ name, control });
  const checked = !!field.value;

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <Switch
          checked={checked}
          onCheckedChange={(val) => !readOnly && field.onChange(val)}
          disabled={disabled || readOnly}
          onBlur={field.onBlur}
        />
        <span className="text-sm leading-none">{label}</span>
      </label>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFSwitch;
