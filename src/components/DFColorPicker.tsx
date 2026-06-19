import { useState, useEffect } from "react";
import { useController, type Control } from "react-hook-form";
import { Input, cn } from "@schema-forms-data/ui";

interface DFColorPickerProps {
  name: string;
  control: Control<Record<string, unknown>>;
  disabled?: boolean;
  readOnly?: boolean;
}

const isValidHex = (v: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);

const DFColorPicker = ({
  name,
  control,
  disabled,
  readOnly,
}: DFColorPickerProps) => {
  const { field, fieldState } = useController({ name, control });
  const fieldValue = (field.value as string) || "#000000";
  // Estado local para o texto — permite digitação intermediária sem armazenar hex inválido
  const [textValue, setTextValue] = useState(fieldValue);

  // Sincroniza quando o valor do form muda externamente (ex: clearedValue)
  useEffect(() => {
    setTextValue(fieldValue);
  }, [fieldValue]);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={isValidHex(fieldValue) ? fieldValue : "#000000"}
          disabled={disabled || readOnly}
          onChange={(e) => field.onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Input
          type="text"
          value={textValue}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            setTextValue(v);
            // Armazena no form apenas quando hex está completo (#RGB ou #RRGGBB)
            if (isValidHex(v)) field.onChange(v.toUpperCase());
          }}
          onBlur={() => {
            // Reverte o texto se a digitação não gerou um hex válido
            if (!isValidHex(textValue)) setTextValue(fieldValue);
            field.onBlur();
          }}
          className={cn(
            "flex-1 font-mono uppercase",
            fieldState.error &&
              "border-destructive focus-visible:ring-destructive",
          )}
          maxLength={7}
          placeholder="#000000"
        />
      </div>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFColorPicker;
