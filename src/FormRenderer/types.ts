import type { RendererContextValue, FieldResolvers, ValidatorMapper, ComponentMapper } from '../RendererContext';
import type { FormSchema } from '@schema-forms-data/core';

export interface StepIndicatorProps {
  steps: Array<{ id: string; label?: string; icone?: string }>;
  currentStep: number;
  onStepClick?: (index: number) => void;
  className?: string;
  /** Se true, exibe o indicador mesmo com apenas 1 step (útil no preview do builder). */
  forceShow?: boolean;
}

export interface FormRendererProps {
  schema: FormSchema;
  initialValues?: Record<string, unknown>;
  /** Step inicial (0-based), restaurado do backend */
  initialStep?: number;
  onSubmitStep?: (
    stepIndex: number,
    data: Record<string, unknown>,
  ) => Promise<void>;
  onComplete?: (data: Record<string, unknown>) => Promise<void>;
  /** Template visual — define cores e estilo dos containers */
  template?: string | null;
  /** Título exibido no topo (era eventoNome) */
  formTitle?: string;
  /** Dados externos/contextuais para interpolação e campos especiais (era eventoData) */
  externalData?: Record<string, unknown>;
  /** Erros de campo vindos do servidor (ex: validação 422) */
  fieldErrors?: Record<string, string>;
  // ── Integrações ────────────────────────────────────────────────────────────
  /**
   * Função para upload de arquivos (campos FILE).
   * Recebe o `File`, o nome do campo e um callback opcional de progresso (0–100).
   * Deve retornar o `uploadId` (string) que será armazenado no formulário.
   *
   * Quando não fornecida, o campo exibe apenas aviso de preview.
   * @see RendererContextValue.uploadFile
   */
  uploadFile?: RendererContextValue['uploadFile'];
  /**
   * Função para deletar um arquivo previamente enviado via `uploadFile`.
   * Quando fornecida, `DFFileUpload` a chama automaticamente ao substituir um arquivo,
   * evitando arquivos órfãos no storage. Erros são silenciados.
   * @see RendererContextValue.deleteUploadedFile
   */
  deleteUploadedFile?: RendererContextValue['deleteUploadedFile'];
  /**
   * Função de lookup de CEP (8 dígitos sem máscara).
   * Quando não fornecida, usa a API pública ViaCEP como fallback.
   * @see RendererContextValue.cepLookup
   */
  cepLookup?: RendererContextValue['cepLookup'];
  /**
   * Função para resolver a URL de preview de um PDF de termos armazenado.
   * Recebe o `uploadId` e deve retornar uma URL temporária de visualização.
   * Quando não fornecida, o campo TERMS usa `termoPdfUrl` ou `termoTexto` como fallback.
   * @see RendererContextValue.resolveTermsUploadUrl
   */
  resolveTermsUploadUrl?: RendererContextValue['resolveTermsUploadUrl'];
  /**
   * Mapa de resolvers de props de campo para `resolvePropsKey`.
   * @see FieldResolvers
   */
  fieldResolvers?: FieldResolvers;
  /**
   * Mapa de validadores customizados para `validate` e `warn` dos campos.
   * @see ValidatorMapper
   */
  validatorMapper?: ValidatorMapper;
  /**
   * Mapa de componentes customizados por tipo de campo.
   * Substitui (ou estende) os componentes internos do renderer.
   *
   * @example
   * ```tsx
   * import { FieldType } from '@schema-forms-data/core';
   *
   * <FormRenderer
   *   schema={schema}
   *   componentMapper={{
   *     [FieldType.TEXTO]: MeuTextField,
   *     [FieldType.SELECT]: MeuSelect,
   *   }}
   * />
   * ```
   */
  componentMapper?: ComponentMapper;
  /**
   * Opções customizadas de pagamento para o `DFPaymentMethod`.
   * Substitui os defaults do modelo IPB para `porDia` e/ou `todosOsDias`.
   * @see PaymentOption
   */
  paymentMethodOptions?: RendererContextValue['paymentMethodOptions'];
  /**
   * Chamada sempre que qualquer campo do step atual for alterado.
   * Recebe os valores atuais do step — útil para autosave, analytics, etc.
   *
   * @example
   * ```tsx
   * <FormRenderer
   *   schema={schema}
   *   onValuesChange={(values) => sessionStorage.setItem('draft', JSON.stringify(values))}
   * />
   * ```
   */
  onValuesChange?: (values: Record<string, unknown>) => void;
  className?: string;
  /** Componente indicador de progress steps customizado */
  StepIndicator?: React.ComponentType<StepIndicatorProps>;
}

export interface StepFormProps {
  stepIndex: number;
  totalSteps: number;
  step: FormSchema['steps'][number];
  defaultValues: Record<string, unknown>;
  externalData: Record<string, unknown>;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  isUploading?: boolean;
  submitError: string | null;
  validatorMapper?: ValidatorMapper;
  onWarningsChange?: (warnings: Record<string, string>) => void;
  onValuesChange?: (values: Record<string, unknown>) => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}
