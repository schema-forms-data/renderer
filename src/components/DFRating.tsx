import { useController, type Control } from "react-hook-form";
import { Star } from "lucide-react";

interface DFRatingProps {
  name: string;
  control: Control<Record<string, unknown>>;
  maxRating?: number;
  disabled?: boolean;
  readOnly?: boolean;
}

const DFRating = ({
  name,
  control,
  maxRating = 5,
  disabled,
  readOnly,
}: DFRatingProps) => {
  const { field, fieldState } = useController({ name, control });
  const value = (field.value as number) ?? 0;
  const stars = Array.from({ length: maxRating }, (_, i) => i + 1);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled || readOnly}
            onClick={() => field.onChange(star === value ? 0 : star)}
            className="transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
          >
            <Star
              size={24}
              className="transition-colors"
              fill={star <= value ? "var(--color-primary)" : "transparent"}
              stroke={star <= value ? "var(--color-primary)" : "currentColor"}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">
            {value}/{maxRating}
          </span>
        )}
      </div>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFRating;
