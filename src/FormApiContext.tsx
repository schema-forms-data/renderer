/**
 * FormApiContext — contexto interno que expõe a API do form para qualquer
 * componente dentro da árvore de renderização.
 *
 * Os hooks públicos (`useFormApi`, `useFormState`, `useField`, `useFieldApi`)
 * combinam este contexto com os hooks nativos do react-hook-form.
 *
 * @example
 * ```tsx
 * // Dentro de qualquer componente dentro do FormRenderer:
 *
 * const api = useFormApi();
 * api.change('nome', 'João');
 * api.submit();
 *
 * const state = useFormState();
 * if (state.dirty) console.log('Form foi alterado');
 *
 * const field = useField('email');
 * console.log(field.value, field.error);
 *
 * const emailApi = useFieldApi('email');
 * return <input {...emailApi.input} />;
 * ```
 */

import { createContext, useContext } from "react";
import { useFormContext, useWatch, useController } from "react-hook-form";

// ── Context interno ────────────────────────────────────────────────────────────

interface FormApiCtxValue {
  /** Flag de submissão em andamento (elevado do StepForm) */
  submitting: boolean;
  /** Avisos de campo computados pelos validadores `warn` */
  warnings: Record<string, string>;
  /** Dispara o submit do formulário programaticamente */
  requestSubmit: () => void;
}

const FormApiCtx = createContext<FormApiCtxValue>({
  submitting: false,
  warnings: {},
  requestSubmit: () => {},
});

/** Provider interno — montado pelo StepForm dentro do FormProvider do RHF */
export const FormApiProvider = FormApiCtx.Provider;

// ── Tipos públicos ─────────────────────────────────────────────────────────────

/**
 * Snapshot do estado do formulário retornado por `useFormApi().getState()`.
 */
export interface FormStateSnapshot {
  values: Record<string, unknown>;
  errors: Record<string, string | undefined>;
  warnings: Record<string, string>;
  dirty: boolean;
  valid: boolean;
  submitting: boolean;
}

/**
 * API programática do formulário, acessível de qualquer componente filho.
 * Retornada por `useFormApi()`.
 */
export interface FormApi {
  /**
   * Altera o valor de um campo e dispara a revalidação.
   * Equivalente a `setValue(name, value, { shouldValidate: true })`.
   */
  change: (name: string, value: unknown) => void;
  /**
   * Dispara o submit do formulário (equivale ao clique no botão "Próximo/Finalizar").
   */
  submit: () => void;
  /**
   * Reseta o formulário para os valores fornecidos (ou os `defaultValues`).
   */
  reset: (values?: Record<string, unknown>) => void;
  /**
   * Retorna um snapshot síncrono do estado atual do formulário.
   */
  getState: () => FormStateSnapshot;
}

/**
 * Estado observável do formulário, atualizado a cada mudança de campo.
 * Retornado por `useFormState()`.
 */
export interface FormStateValue {
  /** Todos os valores atuais do formulário (reativo via `useWatch`) */
  values: Record<string, unknown>;
  /** Erros de validação indexados por nome de campo */
  errors: Record<string, string | undefined>;
  /** Avisos (warn) indexados por nome de campo */
  warnings: Record<string, string>;
  /** `true` se qualquer campo foi alterado em relação aos defaultValues */
  dirty: boolean;
  /** `true` se não há erros de validação */
  valid: boolean;
  /** `true` durante o submit/onSubmit assíncrono */
  submitting: boolean;
}

/**
 * Estado de um campo individual.
 * Retornado por `useField(name)`.
 */
export interface FieldState {
  /** Valor atual do campo */
  value: unknown;
  /** Mensagem de erro de validação, se houver */
  error?: string;
  /** Mensagem de aviso (warn), se houver */
  warning?: string;
  /** `true` se o campo foi alterado em relação ao defaultValue */
  dirty: boolean;
  /** `true` se o campo já recebeu foco e perdeu */
  touched: boolean;
  /** `true` se o campo não tem erros */
  valid: boolean;
}

/**
 * API de campo com props de input e metadados.
 * Retornada por `useFieldApi(name)` — use para criar componentes de campo customizados.
 */
export interface FieldApiReturn {
  /** Props prontas para passar num element de input (`<input {...input} />`) */
  input: {
    name: string;
    value: unknown;
    onChange: (...args: unknown[]) => void;
    onBlur: () => void;
    ref: React.Ref<unknown>;
  };
  /** Metadados de estado do campo */
  meta: {
    error?: string;
    warning?: string;
    touched: boolean;
    dirty: boolean;
    valid: boolean;
  };
}

// ── Hooks públicos ─────────────────────────────────────────────────────────────

/**
 * Retorna a API programática do formulário.
 * Funciona a partir de **qualquer componente** dentro do `<FormRenderer>`.
 *
 * @example
 * ```tsx
 * const api = useFormApi();
 * api.change('plano', 'premium');
 * const state = api.getState();
 * ```
 */
export const useFormApi = (): FormApi => {
  const rhf = useSafeFormContext('useFormApi');
  const ctx = useContext(FormApiCtx);

  return {
    change: (name, value) =>
      rhf.setValue(name, value as never, {
        shouldValidate: true,
        shouldDirty: true,
      }),

    reset: (values) => rhf.reset(values),

    submit: ctx.requestSubmit,

    getState: () => {
      const { errors, isDirty, isValid } = rhf.formState;
      return {
        values: rhf.getValues(),
        errors: Object.fromEntries(
          Object.entries(errors).map(([k, e]) => [
            k,
            (e as { message?: string } | undefined)?.message,
          ]),
        ),
        warnings: ctx.warnings,
        dirty: isDirty,
        valid: isValid,
        submitting: ctx.submitting,
      };
    },
  };
};

/**
 * Retorna o estado observável do formulário, reativo a cada mudança de campo.
 * Funciona a partir de **qualquer componente** dentro do `<FormRenderer>`.
 *
 * @example
 * ```tsx
 * const { values, errors, dirty, valid, submitting, warnings } = useFormState();
 * ```
 */
export const useFormState = (): FormStateValue => {
  const rhf = useSafeFormContext('useFormState');
  const ctx = useContext(FormApiCtx);
  const values = useWatch({ control: rhf.control }) as Record<string, unknown>;
  const { errors, isDirty, isValid } = rhf.formState;

  return {
    values,
    errors: Object.fromEntries(
      Object.entries(errors).map(([k, e]) => [
        k,
        (e as { message?: string } | undefined)?.message,
      ]),
    ),
    warnings: ctx.warnings,
    dirty: isDirty,
    valid: isValid,
    submitting: ctx.submitting,
  };
};

/**
 * Retorna o estado de um campo individual, reativo a mudanças.
 * Funciona a partir de **qualquer componente** dentro do `<FormRenderer>`.
 *
 * @example
 * ```tsx
 * const { value, error, warning, dirty, touched } = useField('email');
 * ```
 */
export const useField = (name: string): FieldState => {
  const rhf = useFormContext<Record<string, unknown>>();
  const { warnings } = useContext(FormApiCtx);
  const value = useWatch({ control: rhf.control, name });
  const fieldState = rhf.getFieldState(name, rhf.formState);

  return {
    value,
    error: (fieldState.error as { message?: string } | undefined)?.message,
    warning: warnings[name],
    dirty: fieldState.isDirty,
    touched: fieldState.isTouched,
    valid: !fieldState.error,
  };
};

/**
 * Retorna `input` props + `meta` para construir componentes de campo customizados.
 * Funciona a partir de **qualquer componente** dentro do `<FormRenderer>`.
 *
 * @example
 * ```tsx
 * const { input, meta } = useFieldApi('email');
 * return (
 *   <div>
 *     <input type="email" {...input} />
 *     {meta.error && <span>{meta.error}</span>}
 *   </div>
 * );
 * ```
 */
export const useFieldApi = (name: string): FieldApiReturn => {
  const { control } = useFormContext<Record<string, unknown>>();
  const { warnings } = useContext(FormApiCtx);
  const { field, fieldState } = useController({ name, control });

  return {
    input: {
      name: field.name,
      value: field.value,
      onChange: field.onChange,
      onBlur: field.onBlur,
      ref: field.ref,
    },
    meta: {
      error: (fieldState.error as { message?: string } | undefined)?.message,
      warning: warnings[name],
      touched: fieldState.isTouched,
      dirty: fieldState.isDirty,
      valid: !fieldState.error,
    },
  };
};



/** Helper interno para validar se os hooks estão no lugar certo */
const useSafeFormContext = (hookName: string) => {
  const rhf = useFormContext<Record<string, unknown>>();
  
  if (!rhf) {
    throw new Error(
      `[SchemaForms] O hook '${hookName}' foi chamado fora de um <FormRenderer />. ` +
      `Certifique-se de que o componente está dentro da árvore de renderização do formulário.`
    );
  }
  
  return rhf;
};
