/**
 * RendererContext — contexto genérico para o FormRenderer.
 *
 * Substitui o UploadContext específico do projeto original.
 * Todas as integrações com APIs externas são injetadas aqui,
 * mantendo o renderer completamente desacoplado de qualquer backend.
 */

import { createContext, useContext } from "react";
import type { Control } from "react-hook-form";
import type { FormField, FieldValidatorConfig } from "@schema-forms-data/core";

export interface CepLookupResult {
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  erro?: boolean;
}

/**
 * Tipo de um resolver de props de campo.
 * Recebe o field original, os valores atuais do form e os dados externos,
 * e retorna um objeto parcial que é mesclado sobre o field antes da renderização.
 *
 * @example
 * ```ts
 * const resolvers: FieldResolvers = {
 *   // Carrega opções de camiseta dinamicamente baseado no evento
 *   opcoes_camiseta: (field, _values, external) => ({
 *     opcoes: (external['evento.tamanhosCamiseta'] as string[])
 *       ?.map(t => ({ valor: t, label: t })) ?? field.opcoes,
 *   }),
 *   // Desabilita campo se participante já pagou
 *   forma_pagamento: (_field, values) => ({
 *     isDisabled: values['pagamento_confirmado'] === true,
 *   }),
 * };
 * ```
 */
export type FieldResolver = (
  field: FormField,
  formValues: Record<string, unknown>,
  externalData: Record<string, unknown>,
) => Partial<FormField>;

export type FieldResolvers = Record<string, FieldResolver>;

/**
 * Função validadora customizada registrada no `validatorMapper`.
 *
 * Recebe:
 * - `value` — valor atual do campo
 * - `allValues` — todos os valores do step (cross-field)
 * - `config` — configuração do validador (`type`, `message` e params extras)
 * - `externalData` — dados externos do formulário
 *
 * Retorna `undefined` se válido, ou a mensagem de erro (sync ou async).
 *
 * @example
 * ```ts
 * const validatorMapper: ValidatorMapper = {
 *   cpfUnico: async (value, _allValues, _config, external) => {
 *     const exists = await api.checkCpf(String(value), external['evento.id']);
 *     return exists ? 'CPF já cadastrado' : undefined;
 *   },
 *   senhasIguais: (value, allValues, config) => {
 *     const other = allValues[config['field'] as string];
 *     return value === other ? undefined : 'As senhas não conferem';
 *   },
 * };
 * ```
 */
export type FieldValidatorFn = (
  value: unknown,
  allValues: Record<string, unknown>,
  config: FieldValidatorConfig,
  externalData: Record<string, unknown>,
) => string | undefined | Promise<string | undefined>;

/**
 * Mapa de validadores customizados indexados pela chave `type`
 * usada em `FormField.validate` e `FormField.warn`.
 */
export type ValidatorMapper = Record<string, FieldValidatorFn>;

/**
 * Opção de pagamento exibida pelo `DFPaymentMethod`.
 *
 * Exporte suas próprias listas a partir dos defaults `OPCOES_POR_DIA` e
 * `OPCOES_TODOS_OS_DIAS` (renderer/src/components/DFPaymentMethod) para usar
 * como ponto de partida ao customizar.
 *
 * @example
 * ```ts
 * import { OPCOES_POR_DIA, PaymentOption } from '@schema-forms-data/renderer';
 *
 * const opcoes: PaymentOption[] = [
 *   ...OPCOES_POR_DIA,
 *   { id: 'boleto', label: 'Boleto', description: '3 dias úteis', Icon: File, taxa: 0 },
 * ];
 * ```
 */
export interface PaymentOption {
  /** Identificador único gravado no campo (ex: `"pix"`, `"cartao"`) */
  id: string;
  /** Rótulo curto exibido no card */
  label: string;
  /** Descrição exibida abaixo do label */
  description: string;
  /** Ícone Lucide ou qualquer `React.FC` */
  Icon: React.FC<{ className?: string }>;
  /** Taxa percentual decimal. Ex: 0.0315 = 3,15%. Use 0 para sem taxa. */
  taxa: number;
  /** Número de parcelas. Omitir (ou 1) para à vista. */
  parcelas?: number;
  /** Texto de taxa exibido abaixo da descrição. Ex: `"Taxa: 3,15%"` */
  taxaLabel?: string;
  /** Se `true`, o card é renderizado desabilitado */
  disabled?: boolean;
}

/**
 * Props recebidas por qualquer componente registrado no `componentMapper`.
 *
 * O campo `field` já vem **resolvido** (após `resolveProps` e `opcoesFromVar`),
 * então o componente customizado pode ler `field.opcoes`, `field.isDisabled`, etc.
 *
 * @example
 * ```tsx
 * const MeuTextField: React.FC<FieldComponentProps> = ({ name, control, field }) => (
 *   <Controller
 *     name={name}
 *     control={control}
 *     render={({ field: f, fieldState }) => (
 *       <MyInput
 *         {...f}
 *         label={field.label}
 *         error={fieldState.error?.message}
 *         disabled={field.isDisabled}
 *       />
 *     )}
 *   />
 * );
 * ```
 */
export interface FieldComponentProps {
  /** Nome do campo no formulário (path do react-hook-form) */
  name: string;
  /** Control do react-hook-form da etapa atual */
  control: Control<Record<string, unknown>>;
  /** Field config resolvido — contém label, opcoes, isDisabled, placeholder, etc. */
  field: FormField;
}

/**
 * Mapa de componentes customizados indexados pelo `tipo` do campo.
 *
 * Registre componentes para **substituir** ou **complementar** os defaults do renderer.
 * Funciona para todos os `FieldType` existentes e também para tipos customizados.
 *
 * @example
 * ```tsx
 * import { FieldType } from '@schema-forms-data/core';
 *
 * const componentMapper: ComponentMapper = {
 *   // Substitui o DFTextField padrão pelo Input do shadcn/ui
 *   [FieldType.TEXTO]: MeuTextField,
 *   // Adiciona um novo tipo de campo 'rating-stars'
 *   'rating-stars': MeuRatingStars,
 * };
 *
 * <FormRenderer schema={schema} componentMapper={componentMapper} />
 * ```
 */
export type ComponentMapper = Record<
  string,
  React.ComponentType<FieldComponentProps>
>;

export interface RendererContextValue {
  /**
   * Função para upload de arquivos.
   * Recebe o File, o nome do campo e um callback opcional de progresso (0-100).
   * Deve retornar o uploadId (string) para armazenar no form.
   *
   * O callback `onProgress` é chamado durante o upload com valores de 0 a 100.
   * Suporta uploads simples e multipart — a implementação decide como reportar.
   *
   * Quando não fornecida, o campo FILE exibe aviso de preview.
   *
   * @example
   * ```ts
   * uploadFile={async (file, fieldName, onProgress) => {
   *   const { uploadUrl } = await api.initiateUpload({ file, campo: fieldName });
   *   await uploadWithProgress(uploadUrl, file, onProgress);
   *   return uploadId;
   * }}
   * ```
   */
  uploadFile?: (
    file: File,
    fieldName: string,
    onProgress?: (percent: number) => void,
  ) => Promise<string>;

  /**
   * Função de lookup de CEP.
   * Recebe o CEP sem máscara (8 dígitos) e retorna os dados de endereço.
   *
   * Quando não fornecida, usa a API pública https://viacep.com.br (padrão).
   */
  cepLookup?: (cep: string, signal?: AbortSignal) => Promise<CepLookupResult>;

  /**
   * Função para deletar um arquivo previamente enviado pelo `uploadFile`.
   * Recebe o uploadId retornado pelo `uploadFile`.
   *
   * Quando fornecida, `DFFileUpload` a chama automaticamente antes de
   * fazer um novo upload (substituição), evitando arquivos órfãos no storage.
   *
   * Erros são silenciados para não bloquear o novo upload.
   */
  deleteUploadedFile?: (uploadId: string) => Promise<void>;

  /**
   * Função para resolver a URL de preview de um PDF de termos armazenado.
   * Recebe o uploadId e deve retornar a URL temporária de preview.
   *
   * Quando não fornecida, o campo TERMS ignora termoPdfUploadId e usa
   * apenas termoPdfUrl (URL direta) ou termoTexto como fallback.
   */
  resolveTermsUploadUrl?: (uploadId: string) => Promise<string>;

  /**
   * Dados externos injetados no formulário.
   * Usados para condicionais com source='evento' e campos como
   * PARTICIPATION_TYPE e PAYMENT_METHOD.
   *
   * Exemplo: { 'evento.dataInicioEvento': '2026-01-01', 'evento.valor': 5000 }
   */
  externalData?: Record<string, unknown>;

  /**
   * Mapa de resolvers de props de campo indexados por `resolvePropsKey`.
   * Cada resolver recebe o field, os valores atuais do form e os dados externos,
   * e retorna um `Partial<FormField>` mesclado dinamicamente antes da renderização.
   *
   * @see FieldResolver
   */
  fieldResolvers?: FieldResolvers;

  /**
   * Mapa de validadores customizados indexados pela chave `type`.
   * Usado pelos arrays `validate` e `warn` de cada campo.
   * Suporta funções síncronas e assíncronas.
   *
   * @example
   * ```ts
   * validatorMapper={{
   *   emailUnico: async (value) => {
   *     const exists = await api.checkEmail(String(value));
   *     return exists ? 'E-mail já cadastrado' : undefined;
   *   },
   *   senhasIguais: (value, allValues, config) => {
   *     return value === allValues[config['field'] as string]
   *       ? undefined
   *       : 'As senhas não conferem';
   *   },
   * }}
   * ```
   */
  validatorMapper?: ValidatorMapper;

  /**
   * Avisos de campo computados a partir dos validadores `warn`.
   * Não bloqueiam o submit — são apenas informativos.
   * Injetado automaticamente pelo FormRenderer.
   */
  fieldWarnings?: Record<string, string>;

  /**
   * Mapa de componentes customizados por tipo de campo.
   * Quando fornecido, substitui o componente padrão do renderer para os tipos registrados.
   *
   * @see ComponentMapper
   */
  componentMapper?: ComponentMapper;

  /**
   * Opções customizadas de pagamento para o `DFPaymentMethod`.
   *
   * Quando definidas, substituem os defaults internos (baseados no modelo IPB).
   * Use `OPCOES_POR_DIA` e `OPCOES_TODOS_OS_DIAS` como ponto de partida.
   *
   * Para substituir o componente inteiramente use `componentMapper[FieldType.PAYMENT_METHOD]`.
   *
   * @example
   * ```tsx
   * import { OPCOES_POR_DIA, OPCOES_TODOS_OS_DIAS, PaymentOption } from '@schema-forms-data/renderer';
   *
   * const paymentMethodOptions = {
   *   porDia: [
   *     ...OPCOES_POR_DIA,
   *     { id: 'boleto', label: 'Boleto', description: '3 dias úteis', Icon: File, taxa: 0 },
   *   ],
   *   todosOsDias: OPCOES_TODOS_OS_DIAS,
   * };
   *
   * <FormRenderer schema={schema} paymentMethodOptions={paymentMethodOptions} />
   * ```
   */
  paymentMethodOptions?: {
    /** Opções exibidas quando o campo `relatedField` indica `"por_dia"` */
    porDia?: PaymentOption[];
    /** Opções exibidas quando `relatedField` indica `"todos_os_dias"` ou é nulo */
    todosOsDias?: PaymentOption[];
  };

  /**
   * Nome do campo PARTICIPATION_TYPE detectado no schema. O FormRenderer preenche
   * automaticamente para que o DFPaymentMethod observe a participação correta sem
   * depender de `relatedFieldName` configurado à mão. Fallback do `DFPaymentMethod`.
   */
  participationFieldName?: string;

  /**
   * Callbacks chamados pelo DFFileUpload para sinalizar início/fim de upload ou deleção.
   * O FormRenderer usa para bloquear navegação de steps enquanto há operação em andamento.
   */
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

const RendererContext = createContext<RendererContextValue>({});

export const useRendererContext = (): RendererContextValue =>
  useContext(RendererContext);

export default RendererContext;
