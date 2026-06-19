/**
 * DFSubForm — Renderiza um sub-formulário inline como grupo de campos aninhados.
 *
 * Os valores dos campos ficam em `formValues[name][subField.nome]`, ou seja,
 * o `name` do sub-form se torna o prefixo de um objeto aninhado no RHF.
 *
 * Suporta os tipos básicos de campo: TEXT, EMAIL, PHONE, CPF, CEP, PASSWORD,
 * NUMBER, TEXTAREA, SELECT, CHECKBOX, SWITCH, DATE, TIME, HIDDEN.
 */

import { type Control } from "react-hook-form";
import {
  FieldType,
  type SubFormSchema,
  type FormField,
} from "@schema-forms-data/core";
import DFTextField from "./DFTextField";
import DFTextarea from "./DFTextarea";
import DFSelect from "./DFSelect";
import DFCheckbox from "./DFCheckbox";
import DFSwitch from "./DFSwitch";
import DFDateField from "./DFDateField";
import DFTimeField from "./DFTimeField";
import DFHidden from "./DFHidden";
import DFMaskedInput from "./DFMaskedInput";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DFSubFormProps {
  name: string;
  control: Control<Record<string, unknown>>;
  subSchema?: SubFormSchema;
  disabled?: boolean;
  readOnly?: boolean;
}

// ─── Renderizador inline de campo (tipos suportados em sub-form) ──────────────

const SubFieldWidget = ({
  field,
  name,
  control,
  disabled,
  readOnly,
}: {
  field: FormField;
  name: string;
  control: Control<Record<string, unknown>>;
  disabled?: boolean;
  readOnly?: boolean;
}) => {
  const isDisabled = disabled || field.isDisabled;
  const isReadOnly = readOnly || field.isReadOnly;

  switch (field.tipo) {
    case FieldType.EMAIL:
      return (
        <DFTextField
          name={name}
          control={control}
          type="email"
          placeholder={field.placeholder}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.NUMBER:
      return (
        <DFTextField
          name={name}
          control={control}
          type="number"
          placeholder={field.placeholder}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.PASSWORD:
      return (
        <DFTextField
          name={name}
          control={control}
          type="password"
          placeholder={field.placeholder}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.TELEFONE:
      return (
        <DFMaskedInput
          name={name}
          control={control}
          maskType="telefone"
          placeholder={field.placeholder ?? "(00) 00000-0000"}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.CPF:
      return (
        <DFMaskedInput
          name={name}
          control={control}
          maskType="cpf"
          placeholder={field.placeholder ?? "000.000.000-00"}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.CEP:
      return (
        <DFMaskedInput
          name={name}
          control={control}
          maskType="cep"
          placeholder={field.placeholder ?? "00000-000"}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.TEXTAREA:
      return (
        <DFTextarea
          name={name}
          control={control}
          placeholder={field.placeholder}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.SELECT:
      return (
        <DFSelect
          name={name}
          control={control}
          options={field.opcoes ?? []}
          placeholder={field.placeholder}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.CHECKBOX:
      return (
        <DFCheckbox
          name={name}
          control={control}
          label={field.label ?? ""}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.SWITCH:
      return (
        <DFSwitch
          name={name}
          control={control}
          label={field.label ?? ""}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.DATE:
      return (
        <DFDateField
          name={name}
          control={control}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.TIME:
      return (
        <DFTimeField
          name={name}
          control={control}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
    case FieldType.HIDDEN:
      return <DFHidden name={name} control={control} />;
    default:
      return (
        <DFTextField
          name={name}
          control={control}
          type="text"
          placeholder={field.placeholder}
          disabled={isDisabled}
          readOnly={isReadOnly}
        />
      );
  }
};

// ─── Componente principal ─────────────────────────────────────────────────────

const DFSubForm = ({
  name,
  control,
  subSchema,
  disabled,
  readOnly,
}: DFSubFormProps) => {
  if (!subSchema || subSchema.fields.length === 0) return null;

  const sortedFields = [...subSchema.fields].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="rounded-xl border border-input bg-muted/30 p-4 space-y-4">
      {subSchema.titulo && (
        <h4 className="text-sm font-semibold text-muted-foreground">
          {subSchema.titulo}
        </h4>
      )}
      <div className="grid grid-cols-12 gap-4">
        {sortedFields.map((subField) => {
          const fieldName = `${name}.${subField.nome}`;
          const noLabel =
            subField.tipo === FieldType.CHECKBOX ||
            subField.tipo === FieldType.SWITCH ||
            subField.tipo === FieldType.HIDDEN;
          const colSpan = subField.tamanho ?? 6;

          return (
            <div key={subField.id} className={`col-span-${colSpan}`}>
              {!noLabel && (
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {subField.label}
                  {subField.obrigatorio && (
                    <span className="text-destructive"> *</span>
                  )}
                </label>
              )}
              <SubFieldWidget
                field={subField}
                name={fieldName}
                control={control}
                disabled={disabled}
                readOnly={readOnly}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DFSubForm;
