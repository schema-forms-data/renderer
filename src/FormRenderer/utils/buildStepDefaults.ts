import { FieldType, type FormSchema } from "@schema-forms-data/core";
import { interpolate } from "../../utils/templateVars";

/**
 * Constrói os defaultValues de um step, dando prioridade a:
 * 1. formData acumulado (já preenchido pelo usuário)
 * 2. initialValue do campo (string com suporte a {{evento.x}})
 * 3. defaultValue do campo (valor estático fixo no schema)
 */
export const buildStepDefaults = (
  step: FormSchema["steps"][number],
  formData: Record<string, unknown>,
  externalData: Record<string, unknown>,
): Record<string, unknown> => {
  const defaults: Record<string, unknown> = { ...formData };
  const varsMap = externalData as Record<string, string>;
  for (const container of step.containers) {
    for (const field of container.campos) {
      if (defaults[field.nome] === undefined) {
        if (field.initialValue !== undefined) {
          defaults[field.nome] =
            typeof field.initialValue === "string"
              ? interpolate(field.initialValue, varsMap)
              : field.initialValue;
        } else if (field.defaultValue !== undefined) {
          defaults[field.nome] = field.defaultValue;
        }
      }
      // Aplicar initialValue/defaultValue de sub-campos de FIELD_ARRAY nos itens já existentes (formData)
      if (field.tipo === FieldType.FIELD_ARRAY && field.subFields?.length) {
        const existingItems = defaults[field.nome];
        if (Array.isArray(existingItems) && existingItems.length > 0) {
          defaults[field.nome] = (existingItems as Record<string, unknown>[]).map((item) => {
            const merged = { ...item };
            for (const sub of field.subFields!) {
              if (merged[sub.nome] !== undefined) continue;
              if (sub.initialValue !== undefined) {
                merged[sub.nome] = typeof sub.initialValue === "string"
                  ? interpolate(sub.initialValue, varsMap)
                  : sub.initialValue;
              } else if (sub.defaultValue !== undefined) {
                merged[sub.nome] = sub.defaultValue;
              }
            }
            return merged;
          });
        }
      }
    }
    // Aplicar initialValue/defaultValue em campos de containers repetíveis (itens já preenchidos)
    // Equivalente ao que é feito para FIELD_ARRAY acima, mas para o modelo container.nome[]
    if (container.repeatable && container.nome) {
      const existingItems = defaults[container.nome];
      if (Array.isArray(existingItems) && existingItems.length > 0) {
        defaults[container.nome] = (existingItems as Record<string, unknown>[]).map((item) => {
          const merged = { ...item };
          for (const field of container.campos) {
            if (merged[field.nome] !== undefined) continue;
            if (field.initialValue !== undefined) {
              merged[field.nome] = typeof field.initialValue === "string"
                ? interpolate(field.initialValue, varsMap)
                : field.initialValue;
            } else if (field.defaultValue !== undefined) {
              merged[field.nome] = field.defaultValue;
            }
          }
          return merged;
        });
      }
    }
  }
  return defaults;
};
