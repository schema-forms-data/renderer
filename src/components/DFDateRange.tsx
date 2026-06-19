import { useController, type Control } from "react-hook-form";
import { Input, Label, cn } from "@schema-forms-data/ui";

interface DFDateRangeProps {
  name: string;
  control: Control<Record<string, unknown>>;
  startLabel?: string;
  endLabel?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

/**
 * Campo de período — armazena `{ start: string; end: string }` no nome do campo.
 */
const DFDateRange = ({
  name,
  control,
  startLabel = "Data inicial",
  endLabel = "Data final",
  disabled,
  readOnly,
}: DFDateRangeProps) => {
  const { field, fieldState } = useController({ name, control });
  const value = (field.value as { start?: string; end?: string }) ?? {};

  const setDate = (key: "start" | "end", date: string) => {
    field.onChange({ ...value, [key]: date });
  };

  const hasError = !!fieldState.error;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>{startLabel}</Label>
          <Input
            type="date"
            value={value.start ?? ""}
            disabled={disabled}
            readOnly={readOnly}
            onChange={(e) => setDate("start", e.target.value)}
            max={value.end ?? undefined}
            className={cn(hasError && "border-destructive focus-visible:ring-destructive")}
          />
        </div>
        <div className="space-y-1">
          <Label>{endLabel}</Label>
          <Input
            type="date"
            value={value.end ?? ""}
            disabled={disabled}
            readOnly={readOnly}
            onChange={(e) => setDate("end", e.target.value)}
            min={value.start ?? undefined}
            className={cn(hasError && "border-destructive focus-visible:ring-destructive")}
          />
        </div>
      </div>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFDateRange;
