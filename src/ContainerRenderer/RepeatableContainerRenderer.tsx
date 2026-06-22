import { useMemo, useEffect, useCallback } from "react";
import type { Control } from "react-hook-form";
import { useFieldArray, useWatch } from "react-hook-form";
import type { FormContainer, FormField } from "@schema-forms-data/core";
import { FieldType } from "@schema-forms-data/core";
import * as icons from "lucide-react";
import { Plus, Trash2 } from "lucide-react";
import { evaluateFieldCondition } from "@schema-forms-data/core";
import { interpolate, interpolateContainer } from "../utils/templateVars";
import { useRendererContext } from "../RendererContext";
import { useContainerStyle } from "./hooks/useContainerStyle";
import { FieldWidget } from "./FieldWidget";

interface RepeatableContainerRendererProps {
  container: FormContainer;
  control: Control<Record<string, unknown>>;
}

const RepeatableContainerRenderer = ({
  container,
  control,
}: RepeatableContainerRendererProps) => {
  const { externalData = {} } = useRendererContext();
  // Usa fallback para que todos os hooks sejam sempre chamados de forma consistente,
  // prevenindo violação das Rules of Hooks quando container.nome é undefined.
  const containerNome = container.nome ?? "__invalid__";
  const minItems = container.minItems ?? 1;
  const maxItems = container.maxItems;
  const itemLabel = container.itemLabel ?? "Item";

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

  // Constrói um item com initialValue/defaultValue dos campos do container.
  // Declarado antes do useEffect que o utiliza para evitar referência a TDZ.
  const buildInitialItem = useCallback((): Record<string, unknown> => {
    const item: Record<string, unknown> = {};
    for (const f of sortedFields) {
      if (f.initialValue !== undefined) {
        item[f.nome] =
          typeof f.initialValue === "string"
            ? interpolate(f.initialValue, varsMap)
            : f.initialValue;
      } else if (f.defaultValue !== undefined) {
        item[f.nome] = f.defaultValue;
      }
    }
    return item;
  }, [sortedFields, varsMap]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { fields, append, remove } = useFieldArray({
    control: control as any,
    name: containerNome,
  });

  useEffect(() => {
    if (!container.nome) return;
    if (fields.length < minItems) {
      for (let i = fields.length; i < minItems; i++) {
        append(buildInitialItem());
      }
    }
    // fields.length e append excluídos intencionalmente: adicionar fields causaria loop;
    // append é referência estável garantida pelo react-hook-form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minItems]);

  const formValues = useWatch({ control }) as Record<string, unknown>;

  // Valores dos itens do container para avaliação de condicionais por item
  const containerItems = useMemo(() => {
    const items = formValues[containerNome];
    return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
  }, [formValues, containerNome]);

  const { wrapperClass, wrapperStyle, headerClass, headerStyle, tmpl } =
    useContainerStyle();

  // Early return APÓS todos os hooks — evita violação das Rules of Hooks
  if (!container.nome) {
    console.error(
      "[RepeatableContainerRenderer] container.nome é obrigatório para containers repetíveis. Container id:",
      container.id,
    );
    return null;
  }

  const renderItemField = (field: FormField, index: number) => {
    // Usa os valores do item específico para avaliar condicionais dentro do container repetível
    const itemValues = containerItems[index] ?? {};
    const visible = evaluateFieldCondition(
      field.condicional,
      itemValues,
      externalData,
    );
    if (!visible) return null;

    const nameOverride = `${containerNome}.${index}.${field.nome}`;
    const tamanho = field.tamanho ?? 12;
    const inicioColuna = field.inicioColuna;
    const gridColumn = inicioColuna
      ? `${inicioColuna} / span ${tamanho}`
      : `span ${tamanho}`;
    const widget = (
      <FieldWidget
        field={field}
        control={control}
        nameOverride={nameOverride}
      />
    );

    if (field.tipo === FieldType.CHECKBOX || field.tipo === FieldType.HIDDEN) {
      return (
        <div
          key={`${field.id}-${index}`}
          className="max-sm:!col-span-12"
          style={{ gridColumn }}
        >
          {widget}
        </div>
      );
    }

    return (
      <div
        key={`${field.id}-${index}`}
        className="max-sm:!col-span-12 space-y-2"
        style={{ gridColumn }}
      >
        <label
          className="font-medium flex items-center gap-1"
          style={{ color: "var(--t-text)" }}
        >
          {field.label}
          {field.obrigatorio && <span className="text-destructive">*</span>}
        </label>
        {widget}
        {field.hint && (
          <p className="text-xs text-muted-foreground">{field.hint}</p>
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

      <div className="p-6 space-y-4">
        {fields.map((item, index) => (
          <div
            key={item.id}
            className="border border-input rounded-lg p-4 bg-muted/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-primary text-primary-foreground">
                  {index + 1}
                </div>
                <span className="text-sm font-semibold">
                  {itemLabel} {index + 1}
                </span>
              </div>
              {fields.length > minItems && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Remover item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-12 gap-4">
              {sortedFields.map((field) => renderItemField(field, index))}
            </div>
          </div>
        ))}

        {(!maxItems || fields.length < maxItems) && (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-input rounded-lg text-sm hover:bg-accent transition-colors"
            onClick={() => append(buildInitialItem())}
          >
            <Plus className="w-4 h-4" />
            Adicionar {itemLabel.toLowerCase()}
          </button>
        )}
        {maxItems && (
          <p className="text-xs text-center text-muted-foreground">
            Máximo de {maxItems} {itemLabel.toLowerCase()}
            {maxItems > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
};

export default RepeatableContainerRenderer;
