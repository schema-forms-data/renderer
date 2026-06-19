import { useController, type Control } from "react-hook-form";
import { Input, cn } from "@schema-forms-data/ui";

interface DFTimeFieldProps {
  name: string;
  control: Control<Record<string, unknown>>;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const DFTimeField = ({
  name,
  control,
  placeholder,
  disabled,
  readOnly,
}: DFTimeFieldProps) => {
  const { field, fieldState } = useController({ name, control });
  const hasError = !!fieldState.error;

  return (
    <div className="space-y-1">
      <Input
        {...field}
        value={(field.value as string) ?? ""}
        type="time"
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(
          hasError && "border-destructive focus-visible:ring-destructive",
        )}
      />
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFTimeField;
