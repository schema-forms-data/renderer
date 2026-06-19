/**
 * FormSpy — observa o estado do formulário em qualquer ponto da árvore.
 *
 * Deve ser montado **dentro** do `<FormRenderer>`.
 * Usa `useFormState()` internamente para acesso reativo a valores, erros,
 * warnings, dirty, valid e submitting.
 *
 * ## Padrões de uso
 *
 * ### Função-filho (render-prop)
 * ```tsx
 * <FormSpy>
 *   {({ values, dirty, valid }) => (
 *     <pre>{JSON.stringify(values, null, 2)}</pre>
 *   )}
 * </FormSpy>
 * ```
 *
 * ### Prop `render`
 * ```tsx
 * <FormSpy render={({ dirty }) => dirty ? <SaveBadge /> : null} />
 * ```
 *
 * ### Callback `onChange` (sem renderização)
 * ```tsx
 * <FormSpy onChange={(state) => autoSave(state.values)} />
 * ```
 *
 * ### Combinado — UI + callback
 * ```tsx
 * <FormSpy onChange={(s) => log(s)}>
 *   {({ submitting }) => submitting && <Spinner />}
 * </FormSpy>
 * ```
 */

import React, { useEffect, useRef } from "react";
import { useFormState } from "./FormApiContext";
import type { FormStateValue } from "./FormApiContext";

export type { FormStateValue };

export interface FormSpyProps {
  /**
   * Função-filho que recebe o estado atual e retorna JSX.
   * Também aceita children estáticos (JSX comum).
   */
  children?: ((state: FormStateValue) => React.ReactNode) | React.ReactNode;

  /**
   * Alternativa ao children como função.
   * Chamada com o estado atual a cada mudança.
   */
  render?: (state: FormStateValue) => React.ReactNode;

  /**
   * Chamada a cada mudança do estado do formulário.
   * Não produz nenhuma saída visual — use para autosave, logging, analytics, etc.
   *
   * ⚠️ Também é chamada no mount inicial com os valores padrão.
   */
  onChange?: (state: FormStateValue) => void;
}

/**
 * Componente observador do estado do formulário.
 * Deve ser montado dentro do `<FormRenderer>`.
 */
export const FormSpy: React.FC<FormSpyProps> = ({
  children,
  render,
  onChange,
}) => {
  const state = useFormState();

  // Ref estável para evitar que onChange apareça como dependência do effect
  const stableOnChange = useRef(onChange);
  stableOnChange.current = onChange;

  useEffect(() => {
    stableOnChange.current?.(state);
    // O efeito re-executa quando useFormState() retorna um novo snapshot,
    // o que ocorre apenas quando useWatch detecta mudança nos valores/erros/warnings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    state.values,
    state.dirty,
    state.valid,
    state.submitting,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    state.errors,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    state.warnings,
  ]);

  if (render) {
    return <>{render(state)}</>;
  }

  if (typeof children === "function") {
    return <>{(children as (s: FormStateValue) => React.ReactNode)(state)}</>;
  }

  // Children estático (ou undefined)
  return children !== undefined ? <>{children}</> : null;
};

export default FormSpy;
