import { useState } from "react";
import { useController, type Control } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { Input, cn } from "@schema-forms-data/ui";

interface DFPasswordFieldProps {
  name: string;
  control: Control<Record<string, unknown>>;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const DFPasswordField = ({
  name,
  control,
  placeholder,
  disabled,
  readOnly,
}: DFPasswordFieldProps) => {
  const { field, fieldState } = useController({ name, control });
  const [show, setShow] = useState(false);
  const hasError = !!fieldState.error;

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          {...field}
          value={(field.value as string) ?? ""}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            "pr-10",
            hasError && "border-destructive focus-visible:ring-destructive",
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFPasswordField;
