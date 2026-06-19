import { useController, type Control } from "react-hook-form";
import type { FieldOption } from "@schema-forms-data/core";
import { RadioGroup, RadioGroupItem, cn } from "@schema-forms-data/ui";

interface DFRadioGroupProps {
  name: string;
  control: Control<Record<string, unknown>>;
  options: FieldOption[];
  visualStyle?: "default" | "card";
  disabled?: boolean;
}

const DFRadioGroup = ({
  name,
  control,
  options,
  visualStyle = "default",
  disabled,
}: DFRadioGroupProps) => {
  const { field, fieldState } = useController({ name, control });
  const isCard = visualStyle === "card";

  return (
    <div className="space-y-1" onBlur={field.onBlur}>
      <RadioGroup
        value={(field.value as string) ?? ""}
        onValueChange={field.onChange}
        className={cn(
          isCard
            ? "grid grid-cols-2 gap-2 sm:grid-cols-3"
            : "flex flex-col gap-2",
        )}
      >
        {options.map((opt) => (
          <label
            key={opt.valor}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              isCard &&
                "rounded-lg border p-3 transition-colors hover:bg-accent data-[selected=true]:border-primary data-[selected=true]:bg-primary/5",
              (disabled || opt.disabled) && "cursor-not-allowed opacity-50",
            )}
            data-selected={field.value === opt.valor ? "true" : undefined}
          >
            <RadioGroupItem
              value={opt.valor}
              disabled={disabled || opt.disabled}
            />
            <span className="text-sm leading-none">{opt.label}</span>
          </label>
        ))}
      </RadioGroup>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFRadioGroup;
