// @schema-forms-data/renderer — public API

export { default as FormRenderer } from './FormRenderer';
export { default as DefaultStepIndicator } from './FormRenderer/DefaultStepIndicator';
export type { FormRendererProps, StepIndicatorProps } from './FormRenderer';

export { FormSpy } from './FormSpy';
export type { FormSpyProps } from './FormSpy';

export { default as StepRenderer } from './StepRenderer';
export { default as ContainerRenderer } from './ContainerRenderer';

export { default as RendererContext, useRendererContext } from './RendererContext';
export type {
    RendererContextValue,
    CepLookupResult,
    FieldResolver,
    FieldResolvers,
    FieldValidatorFn,
    ValidatorMapper,
    FieldComponentProps,
    ComponentMapper,
} from './RendererContext';

export {
    useFormApi,
    useFormState,
    useField,
    useFieldApi,
} from './FormApiContext';
export type {
    FormApi,
    FormStateSnapshot,
    FormStateValue,
    FieldState,
    FieldApiReturn,
} from './FormApiContext';

export { makeStepResolver, makeStepWarnComputer } from './formResolver';
export { evaluateFieldCondition } from '@schema-forms-data/core';
export { interpolate, interpolateField, interpolateContainer, interpolateStep } from './utils/templateVars';

// Field components (for custom renderers / advanced use)
export { default as DFTextField } from './components/DFTextField';
export { default as DFTextarea } from './components/DFTextarea';
export { default as DFSelect } from './components/DFSelect';
export { default as DFCheckbox } from './components/DFCheckbox';
export { default as DFCheckboxGroup } from './components/DFCheckboxGroup';
export { default as DFRadioGroup } from './components/DFRadioGroup';
export { default as DFDateField } from './components/DFDateField';
export { default as DFMaskedInput } from './components/DFMaskedInput';
export { default as DFHidden } from './components/DFHidden';
export { default as DFCepField } from './components/DFCepField';
export { default as DFFileUpload } from './components/DFFileUpload';
export { default as DFFieldArray } from './components/DFFieldArray';
export { default as DFTerms } from './components/DFTerms';
export { default as DFParticipationType } from './components/DFParticipationType';
export type { DFParticipationTypeProps, ParticipationValue } from './components/DFParticipationType';

export { default as DFPaymentMethod } from './components/DFPaymentMethod';
export type { DFPaymentMethodProps, PaymentMethodValue } from './components/DFPaymentMethod';
export { OPCOES_POR_DIA, OPCOES_TODOS_OS_DIAS } from './components/DFPaymentMethod';

export type { PaymentOption } from './RendererContext';
