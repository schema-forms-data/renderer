import { useController, type Control } from "react-hook-form";
import { Textarea, cn } from "@schema-forms-data/ui";

interface DFTextareaProps {
  name: string;
  control: Control<Record<string, unknown>>;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const DFTextarea = ({
  name,
  control,
  placeholder,
  disabled,
  readOnly,
}: DFTextareaProps) => {
  const { field, fieldState } = useController({ name, control });
  return (
    <div className="space-y-1">
      <Textarea
        {...field}
        value={(field.value as string) ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        rows={3}
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

export default DFTextarea;
