import { useMemo } from "react";
import type { Control } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { FormStep } from "@schema-forms-data/core";
import { evaluateFieldCondition } from "@schema-forms-data/core";
import ContainerRenderer from "./ContainerRenderer";

interface StepRendererProps {
  step: FormStep;
  control: Control<Record<string, unknown>>;
  externalData?: Record<string, unknown>;
}

const StepRenderer = ({
  step,
  control,
  externalData = {},
}: StepRendererProps) => {
  const sortedContainers = useMemo(
    () => [...step.containers].sort((a, b) => a.ordem - b.ordem),
    [step.containers],
  );

  const formValues = useWatch({ control }) as Record<string, unknown>;

  return (
    <div className="grid grid-cols-12 gap-4">
      {sortedContainers.map((container) => {
        // ── condicional de container ──────────────────────────────────────
        if (
          container.condicional &&
          !evaluateFieldCondition(
            container.condicional,
            formValues,
            externalData,
          )
        ) {
          return null;
        }

        const tamanho = container.tamanho ?? 12;
        const inicioColuna = container.inicioColuna;
        const gridColumn = inicioColuna
          ? `${inicioColuna} / span ${tamanho}`
          : `span ${tamanho}`;

        return (
          <div
            key={container.id}
            className="max-sm:!col-span-12"
            style={{ gridColumn }}
          >
            <ContainerRenderer container={container} control={control} />
          </div>
        );
      })}
    </div>
  );
};

export default StepRenderer;
