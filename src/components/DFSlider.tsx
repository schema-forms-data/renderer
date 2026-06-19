import { useEffect } from "react";
import { useController, type Control } from "react-hook-form";
import { Slider } from "@schema-forms-data/ui";

interface DFSliderProps {
  name: string;
  control: Control<Record<string, unknown>>;
  minValue?: number;
  maxValue?: number;
  step?: number;
  disabled?: boolean;
  readOnly?: boolean;
}

const DFSlider = ({
  name,
  control,
  minValue = 0,
  maxValue = 100,
  step = 1,
  disabled,
  readOnly,
}: DFSliderProps) => {
  const { field, fieldState } = useController({ name, control });
  const value = (field.value as number) ?? minValue;

  // Registra o valor inicial para que o submit receba minValue em vez de undefined
  useEffect(() => {
    if (field.value === undefined || field.value === null) {
      field.onChange(minValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <Slider
          min={minValue}
          max={maxValue}
          step={step}
          value={[value]}
          onValueChange={(vals) => !readOnly && field.onChange(vals[0])}
          disabled={disabled || readOnly}
          className="flex-1"
        />
        <span className="text-sm font-medium text-primary min-w-[3rem] text-right tabular-nums">
          {value}
        </span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{minValue}</span>
        <span>{maxValue}</span>
      </div>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFSlider;
