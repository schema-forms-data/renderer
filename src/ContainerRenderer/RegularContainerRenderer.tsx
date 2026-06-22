import { useMemo } from "react";
import type { Control } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { FormContainer, FormField } from "@schema-forms-data/core";
import { FieldType } from "@schema-forms-data/core";
import * as icons from "lucide-react";
import { evaluateFieldCondition } from "@schema-forms-data/core";
import { interpolateContainer } from "../utils/templateVars";
import { useRendererContext } from "../RendererContext";
import { useContainerStyle } from "./hooks/useContainerStyle";
import { FieldWidget } from "./FieldWidget";

interface RegularContainerRendererProps {
  container: FormContainer;
  control: Control<Record<string, unknown>>;
}

const RegularContainerRenderer = ({
  container,
  control,
}: RegularContainerRendererProps) => {
  const { externalData = {}, fieldResolvers } = useRendererContext();
  const Icon = container.icone
    ? ((icons as Record<string, unknown>)[container.icone] as
        | icons.LucideIcon
        | undefined)
    : undefined;

  const varsMap = externalData as Record<string, string>;
  const interpolated = useMemo(
    () => interpolateContainer(container, varsMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [container, JSON.stringify(varsMap)],
  );

  const sortedFields = useMemo(
    () => [...interpolated.campos].sort((a, b) => a.ordem - b.ordem),
    [interpolated.campos],
  );

  const formValues = useWatch({ control }) as Record<string, unknown>;

  // Nota: a limpeza de campos ocultos (clearedValue) é responsabilidade
  // centralizada do StepForm — não duplicar aqui.

  const { wrapperClass, wrapperStyle, headerClass, headerStyle, tmpl } =
    useContainerStyle();

  const renderField = (field: FormField) => {
    const visible = evaluateFieldCondition(
      field.condicional,
      formValues,
      externalData,
    );
    if (!visible) return null;

    let resolvedField = field;
    if (field.resolvePropsKey && fieldResolvers?.[field.resolvePropsKey]) {
      const overrides = fieldResolvers[field.resolvePropsKey](
        field,
        formValues,
        externalData,
      );
      resolvedField = { ...field, ...overrides };
    }

    // ── opcoesFromVar: carrega opções de externalData se configurado ──────
    if (resolvedField.opcoesFromVar) {
      const raw = externalData[resolvedField.opcoesFromVar];
      if (Array.isArray(raw)) {
        resolvedField = {
          ...resolvedField,
          opcoes: raw.map((item: unknown) => {
            if (typeof item === "string") return { valor: item, label: item };
            if (
              item &&
              typeof item === "object" &&
              "valor" in item &&
              "label" in item
            )
              return item as { valor: string; label: string };
            return { valor: String(item), label: String(item) };
          }),
        };
      }
    }

    const tamanho = resolvedField.tamanho ?? 12;
    const inicioColuna = resolvedField.inicioColuna;
    const gridColumn = inicioColuna
      ? `${inicioColuna} / span ${tamanho}`
      : `span ${tamanho}`;
    const widget = <FieldWidget field={resolvedField} control={control} />;

    if (
      resolvedField.tipo === FieldType.CHECKBOX ||
      resolvedField.tipo === FieldType.HIDDEN ||
      resolvedField.tipo === FieldType.SWITCH
    ) {
      return (
        <div
          key={resolvedField.id}
          className="max-sm:!col-span-12"
          style={{ gridColumn }}
        >
          {widget}
        </div>
      );
    }

    return (
      <div
        key={resolvedField.id}
        className="max-sm:!col-span-12 space-y-2"
        style={{ gridColumn }}
      >
        <label
          className="font-medium flex items-center gap-1"
          style={{ color: "var(--t-text)" }}
        >
          {resolvedField.label}
          {resolvedField.obrigatorio && (
            <span className="text-destructive">*</span>
          )}
        </label>
        {widget}
        {resolvedField.hint && (
          <p className="text-xs text-muted-foreground">{resolvedField.hint}</p>
        )}
      </div>
    );
  };

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      {(interpolated.titulo || Icon) && (
        <div className={headerClass} style={headerStyle}>
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className="p-2 rounded-xl"
                style={{
                  background:
                    "color-mix(in srgb, var(--t-primary) 12%, transparent)",
                }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: "var(--t-primary)" }}
                />
              </div>
            )}
            <div>
              <h3
                className={
                  tmpl.typography?.stepTitleClass ?? "text-lg font-semibold"
                }
                style={{ color: "var(--t-text)" }}
              >
                {interpolated.titulo}
              </h3>
              {interpolated.descricao && (
                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                  {interpolated.descricao}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="p-6 grid grid-cols-12 gap-4">
        {sortedFields.map(renderField)}
      </div>
    </div>
  );
};

export default RegularContainerRenderer;
