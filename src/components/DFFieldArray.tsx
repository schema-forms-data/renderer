/**
 * DFFieldArray — Campo que gerencia um array de objetos (sub-formulário repetível).
 *
 * Cada item do array contém os campos definidos em `subFields`.
 * O valor salvo no form data tem o formato:
 *   { [nome]: [{ campo1: '...', campo2: '...' }, ...] }
 */

import { useCallback, useEffect } from "react";
import { useFieldArray, useFormState, type Control } from "react-hook-form";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import type { FormField } from "@schema-forms-data/core";
import { FieldType } from "@schema-forms-data/core";
import { Button } from "@schema-forms-data/ui";
import DFTextField from "./DFTextField";
import DFTextarea from "./DFTextarea";
import DFSelect from "./DFSelect";
import DFCheckbox from "./DFCheckbox";
import DFCheckboxGroup from "./DFCheckboxGroup";
import DFRadioGroup from "./DFRadioGroup";
import DFDateField from "./DFDateField";
import DFFileUpload from "./DFFileUpload";
import DFMaskedInput from "./DFMaskedInput";
import DFHidden from "./DFHidden";
import DFCepField from "./DFCepField";

// ─── Widget para cada sub-campo ───────────────────────────────────────────────

const SubFieldWidget = ({
  field,
  control,
  nameOverride,
}: {
  field: FormField;
  control: Control<Record<string, unknown>>;
  nameOverride: string;
}) => {
  const common = {
    name: nameOverride,
    control,
    placeholder: field.placeholder,
  };

  switch (field.tipo) {
    case FieldType.TEXTO:
      return <DFTextField {...common} type="text" />;
    case FieldType.EMAIL:
      return <DFTextField {...common} type="email" />;
    case FieldType.NUMBER:
      return <DFTextField {...common} type="number" />;
    case FieldType.TEXTAREA:
      return <DFTextarea {...common} />;
    case FieldType.SELECT:
      return <DFSelect {...common} options={field.opcoes ?? []} />;
    case FieldType.RADIO:
      return <DFRadioGroup {...common} options={field.opcoes ?? []} />;
    case FieldType.CHECKBOX:
      return (
        <DFCheckbox name={nameOverride} control={control} label={field.label} />
      );
    case FieldType.CHECKBOX_GROUP:
      return <DFCheckboxGroup {...common} options={field.opcoes ?? []} />;
    case FieldType.DATE:
      return <DFDateField {...common} validacao={field.validacao} />;
    case FieldType.DATETIME:
      return <DFDateField {...common} isDatetime validacao={field.validacao} />;
    case FieldType.FILE:
      return <DFFileUpload name={nameOverride} control={control} />;
    case FieldType.TELEFONE:
      return <DFMaskedInput {...common} maskType="telefone" />;
    case FieldType.CPF:
      return <DFMaskedInput {...common} maskType="cpf" />;
    case FieldType.CEP:
      return (
        <DFCepField
          name={nameOverride}
          control={control}
          placeholder={field.placeholder}
        />
      );
    case FieldType.HIDDEN:
      return <DFHidden name={nameOverride} control={control} />;
    default:
      console.error(
        `[DFFieldArray] Tipo de sub-campo "${field.tipo}" não suportado em FIELD_ARRAY. Usando DFTextField como fallback.`,
      );
      return <DFTextField {...common} type="text" />;
  }
};

// ─── Componente principal ─────────────────────────────────────────────────────

export interface DFFieldArrayProps {
  name: string;
  control: Control<Record<string, unknown>>;
  subFields?: FormField[];
  minItems?: number;
  maxItems?: number;
  itemLabel?: string;
  addLabel?: string;
}

const DFFieldArray = ({
  name,
  control,
  subFields = [],
  minItems = 1,
  maxItems,
  itemLabel = "Item",
  addLabel,
}: DFFieldArrayProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { fields, append, remove } = useFieldArray({
    control: control as any,
    name,
  });
  const { errors } = useFormState({ control });
  const rootError = (errors[name] as { message?: string } | undefined)?.message;

  // Constrói um item inicial com initialValue/defaultValue dos sub-campos
  const buildInitialItem = useCallback((): Record<string, unknown> => {
    const item: Record<string, unknown> = {};
    for (const sf of subFields) {
      if (sf.initialValue !== undefined) item[sf.nome] = sf.initialValue;
      else if (sf.defaultValue !== undefined) item[sf.nome] = sf.defaultValue;
    }
    return item;
  }, [subFields]);

  useEffect(() => {
    if (fields.length < minItems) {
      for (let i = fields.length; i < minItems; i++) {
        append(buildInitialItem());
      }
    }
    // fields.length e append excluídos intencionalmente: adicionar fields causaria loop;
    // append é referência estável garantida pelo react-hook-form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minItems]);

  const sortedSubFields = [...subFields].sort((a, b) => a.ordem - b.ordem);
  const canAdd = !maxItems || fields.length < maxItems;
  const resolvedAddLabel = addLabel ?? `Adicionar ${itemLabel.toLowerCase()}`;

  return (
    <div className="space-y-3">
      {fields.map((item, index) => (
        <div
          key={item.id}
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--t-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                {index + 1}
              </div>
              <span className="text-sm font-semibold">
                {itemLabel} {index + 1}
              </span>
            </div>
            {fields.length > minItems && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                aria-label={`Remover ${itemLabel.toLowerCase()} ${index + 1}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-12 gap-4">
            {sortedSubFields.map((subField) => {
              const nameOverride = `${name}.${index}.${subField.nome}`;
              const tamanho = subField.tamanho ?? 12;
              const gridColumn = `span ${tamanho}`;
              const widget = (
                <SubFieldWidget
                  field={subField}
                  control={control}
                  nameOverride={nameOverride}
                />
              );

              if (
                subField.tipo === FieldType.CHECKBOX ||
                subField.tipo === FieldType.HIDDEN
              ) {
                return (
                  <div
                    key={subField.id}
                    className="max-sm:!col-span-12"
                    style={{ gridColumn }}
                  >
                    {widget}
                  </div>
                );
              }

              return (
                <div
                  key={subField.id}
                  className="max-sm:!col-span-12 space-y-2"
                  style={{ gridColumn }}
                >
                  <label className="font-medium flex items-center gap-1 text-sm text-foreground">
                    {subField.label}
                    {subField.obrigatorio && (
                      <span className="text-destructive">*</span>
                    )}
                  </label>
                  {widget}
                  {subField.hint && (
                    <p className="text-xs text-muted-foreground">
                      {subField.hint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {canAdd && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => append(buildInitialItem())}
        >
          <Plus className="w-4 h-4" />
          {resolvedAddLabel}
        </Button>
      )}

      {maxItems && (
        <p className="text-xs text-center text-muted-foreground">
          Máximo de {maxItems} {itemLabel.toLowerCase()}
          {maxItems > 1 ? "s" : ""}
        </p>
      )}

      {rootError && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {rootError}
        </p>
      )}
    </div>
  );
};

export default DFFieldArray;
