import type { Control } from "react-hook-form";
import type { FormField } from "@schema-forms-data/core";
import { FieldType } from "@schema-forms-data/core";
import { useRendererContext } from "../RendererContext";
import DFTextField from "../components/DFTextField";
import DFTextarea from "../components/DFTextarea";
import DFSelect from "../components/DFSelect";
import DFCheckbox from "../components/DFCheckbox";
import DFCheckboxGroup from "../components/DFCheckboxGroup";
import DFRadioGroup from "../components/DFRadioGroup";
import DFDateField from "../components/DFDateField";
import DFFileUpload from "../components/DFFileUpload";
import DFMaskedInput from "../components/DFMaskedInput";
import DFHidden from "../components/DFHidden";
import DFCepField from "../components/DFCepField";
import DFFieldArray from "../components/DFFieldArray";
import DFParticipationType from "../components/DFParticipationType";
import DFPaymentMethod from "../components/DFPaymentMethod";
import DFTerms from "../components/DFTerms";
import DFPasswordField from "../components/DFPasswordField";
import DFSwitch from "../components/DFSwitch";
import DFSlider from "../components/DFSlider";
import DFColorPicker from "../components/DFColorPicker";
import DFAutocomplete from "../components/DFAutocomplete";
import DFTimeField from "../components/DFTimeField";
import DFDateRange from "../components/DFDateRange";
import DFRating from "../components/DFRating";
import DFSubForm from "../components/DFSubForm";

interface FieldWidgetProps {
  field: FormField;
  control: Control<Record<string, unknown>>;
  nameOverride?: string;
}

export const FieldWidget = ({ field, control, nameOverride }: FieldWidgetProps) => {
  const name = nameOverride ?? field.nome;
  const { componentMapper } = useRendererContext();

  const CustomComponent = componentMapper?.[field.tipo];
  if (CustomComponent) {
    return <CustomComponent name={name} control={control} field={field} />;
  }

  const common = {
    name,
    control,
    placeholder: field.placeholder,
    disabled: field.isDisabled,
    readOnly: field.isReadOnly,
  };

  switch (field.tipo) {
    case FieldType.TEXTO:
      return <DFTextField {...common} type="text" />;
    case FieldType.EMAIL:
      return <DFTextField {...common} type="email" />;
    case FieldType.NUMBER:
      return <DFTextField {...common} type="number" />;
    case FieldType.PASSWORD:
      return <DFPasswordField {...common} />;
    case FieldType.TEXTAREA:
      return <DFTextarea {...common} />;
    case FieldType.SELECT:
      return <DFSelect {...common} options={field.opcoes ?? []} />;
    case FieldType.AUTOCOMPLETE:
      return <DFAutocomplete {...common} options={field.opcoes ?? []} />;
    case FieldType.SWITCH:
      return (
        <DFSwitch
          name={name}
          control={control}
          label={field.label}
          disabled={field.isDisabled}
          readOnly={field.isReadOnly}
        />
      );
    case FieldType.SLIDER:
      return (
        <DFSlider
          name={name}
          control={control}
          minValue={field.minValue}
          maxValue={field.maxValue}
          step={field.step}
          disabled={field.isDisabled}
          readOnly={field.isReadOnly}
        />
      );
    case FieldType.RATING:
      return (
        <DFRating
          name={name}
          control={control}
          maxRating={field.maxRating}
          disabled={field.isDisabled}
          readOnly={field.isReadOnly}
        />
      );
    case FieldType.COLOR:
      return (
        <DFColorPicker
          name={name}
          control={control}
          disabled={field.isDisabled}
          readOnly={field.isReadOnly}
        />
      );
    case FieldType.TIME:
      return <DFTimeField {...common} />;
    case FieldType.DATE_RANGE:
      return (
        <DFDateRange
          name={name}
          control={control}
          startLabel={field.dateRangeStartLabel}
          endLabel={field.dateRangeEndLabel}
          disabled={field.isDisabled}
          readOnly={field.isReadOnly}
        />
      );
    case FieldType.RADIO:
      return <DFRadioGroup {...common} options={field.opcoes ?? []} />;
    case FieldType.CHECKBOX:
      return (
        <DFCheckbox
          name={name}
          control={control}
          label={field.label}
          disabled={field.isDisabled}
          readOnly={field.isReadOnly}
        />
      );
    case FieldType.CHECKBOX_GROUP:
      return <DFCheckboxGroup {...common} options={field.opcoes ?? []} />;
    case FieldType.DATE:
      return (
        <DFDateField
          name={name}
          control={control}
          disabled={field.isDisabled}
          readOnly={field.isReadOnly}
          validacao={field.validacao}
        />
      );
    case FieldType.DATETIME:
      return (
        <DFDateField
          name={name}
          control={control}
          isDatetime
          disabled={field.isDisabled}
          readOnly={field.isReadOnly}
          validacao={field.validacao}
        />
      );
    case FieldType.FILE:
      return (
        <DFFileUpload
          name={name}
          control={control}
          disabled={field.isDisabled}
          fileTypes={field.validacao?.fileTypes}
          maxFileSize={field.validacao?.maxFileSize}
        />
      );
    case FieldType.TELEFONE:
      return <DFMaskedInput {...common} maskType="telefone" />;
    case FieldType.CPF:
      return <DFMaskedInput {...common} maskType="cpf" />;
    case FieldType.CEP:
      return (
        <DFCepField
          name={name}
          control={control}
          placeholder={field.placeholder}
          disabled={field.isDisabled}
          readOnly={field.isReadOnly}
          cepFillMap={field.cepFillMap}
        />
      );
    case FieldType.HIDDEN:
      return <DFHidden name={name} control={control} />;
    case FieldType.PARTICIPATION_TYPE:
      return <DFParticipationType name={name} control={control} />;
    case FieldType.PAYMENT_METHOD:
      return (
        <DFPaymentMethod
          name={name}
          control={control}
          relatedFieldName={field.relatedFieldName}
        />
      );
    case FieldType.TERMS:
      return (
        <DFTerms
          name={name}
          control={control}
          label={field.label}
          termoTexto={field.termoTexto}
          termoPdfUrl={field.termoPdfUrl}
          termoPdfUploadId={field.termoPdfUploadId}
        />
      );
    case FieldType.FIELD_ARRAY:
      return (
        <DFFieldArray
          name={name}
          control={control}
          subFields={field.subFields}
          minItems={field.minItems}
          maxItems={field.maxItems}
          itemLabel={field.itemLabel}
          addLabel={field.addLabel}
        />
      );
    case FieldType.SUB_FORM:
      return (
        <DFSubForm
          name={name}
          control={control}
          subSchema={field.subSchema}
          disabled={field.isDisabled}
          readOnly={field.isReadOnly}
        />
      );
    default:
      return <DFTextField {...common} type="text" />;
  }
};
