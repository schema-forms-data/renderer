import { useState, useMemo, useEffect, useRef } from "react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as icons from "lucide-react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button, cn } from "@schema-forms-data/ui";
import { FieldType, evaluateFieldCondition } from "@schema-forms-data/core";
import { makeStepResolver, makeStepWarnComputer } from "../formResolver";
import { interpolate, interpolateStep } from "../utils/templateVars";
import StepRenderer from "../StepRenderer";
import { FormApiProvider } from "../FormApiContext";
import type { StepFormProps } from "./types";

const StepForm = ({
  stepIndex,
  totalSteps,
  step,
  defaultValues,
  externalData,
  fieldErrors,
  isSubmitting,
  isUploading = false,
  submitError,
  validatorMapper = {},
  onWarningsChange,
  onValuesChange,
  onSubmit,
  onBack,
}: StepFormProps) => {
  const isLastStep = stepIndex === totalSteps - 1;

  // Chave estável baseada no conteúdo de externalData — evita recriar o resolver
  // a cada render quando externalData muda por referência mas não por conteúdo
  const externalDataKey = useMemo(
    () => JSON.stringify(externalData),
    [externalData],
  );

  const resolver = useMemo(
    () => makeStepResolver(step, externalData, validatorMapper),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step.id, externalDataKey],
  );

  const warnComputer = useMemo(
    () => makeStepWarnComputer(step, externalData, validatorMapper),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step.id, externalDataKey],
  );

  const [fieldWarnings, setFieldWarnings] = useState<Record<string, string>>(
    {},
  );

  const stableOnWarningsChange = useRef(onWarningsChange);
  stableOnWarningsChange.current = onWarningsChange;

  const varsMap = externalData as Record<string, string>;
  const interpolated = useMemo(
    () => interpolateStep(step, varsMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, externalDataKey],
  );

  const methods = useForm<Record<string, unknown>>({
    resolver,
    defaultValues,
    mode: "onTouched",
  });
  const { control, handleSubmit, setError, clearErrors, setValue } = methods;

  useEffect(() => {
    clearErrors();
    for (const [name, message] of Object.entries(fieldErrors)) {
      setError(name, { type: "server", message });
    }
  }, [fieldErrors, setError, clearErrors]);

  // Campos condicionais em containers NÃO-repetíveis — cobre clearedValue, clearErrors e setValues
  const allConditionalFields = useMemo(
    () =>
      step.containers
        .filter((c) => !c.repeatable)
        .flatMap((c) => c.campos)
        .filter((f) => !!f.condicional),
    [step.containers],
  );

  const containersWithConditional = useMemo(
    () => step.containers.filter((c) => !!c.condicional),
    [step.containers],
  );

  const allSetValueFields = useMemo(
    () =>
      step.containers
        .filter((c) => !c.repeatable)
        .flatMap((c) => c.campos)
        .filter((f) => f.condicional && f.setValues?.length),
    [step.containers],
  );

  // Campos condicionais dentro de containers repetíveis — requerem path indexado (container.nome.i.field)
  const repeatableContainerConditionalFields = useMemo(
    () =>
      step.containers
        .filter((c) => c.repeatable && !!c.nome)
        .map((c) => ({
          container: c,
          fields: c.campos.filter((f) => !!f.condicional),
        }))
        .filter((e) => e.fields.length > 0),
    [step.containers],
  );

  const prevVisibilityRef = useRef<Record<string, boolean>>({});
  // Evita disparar setValues no mount/remount do step: só dispara em transições genuine de oculto→visível
  const isFirstSetValuesRun = useRef(true);
  const allWatchedValues = useWatch({ control });

  const stableOnValuesChange = useRef(onValuesChange);
  stableOnValuesChange.current = onValuesChange;

  useEffect(() => {
    stableOnValuesChange.current?.(allWatchedValues as Record<string, unknown>);
  }, [allWatchedValues]);

  // ── warn: computa avisos assíncronos sem bloquear submit ─────────────────
  useEffect(() => {
    let cancelled = false;
    const values = allWatchedValues as Record<string, unknown>;
    warnComputer(values)
      .then((warns) => {
        if (!cancelled) {
          setFieldWarnings(warns);
          stableOnWarningsChange.current?.(warns);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[StepForm] warnComputer error:", err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [allWatchedValues, warnComputer]);

  useEffect(() => {
    if (
      !allConditionalFields.length &&
      !allSetValueFields.length &&
      !containersWithConditional.length &&
      !repeatableContainerConditionalFields.length
    )
      return;
    const values = allWatchedValues as Record<string, unknown>;

    // Loop único: trata clearedValue, erros residuais e sub-itens de FIELD_ARRAY ocultos
    for (const field of allConditionalFields) {
      const visible = evaluateFieldCondition(
        field.condicional,
        values,
        externalData,
      );
      if (!visible) {
        clearErrors(field.nome);
        // Para FIELD_ARRAY: limpa também os erros de cada sub-item (evita isValid falso-negativo)
        if (field.tipo === FieldType.FIELD_ARRAY) {
          const items = values[field.nome];
          if (Array.isArray(items)) {
            items.forEach((_, i) => {
              (field.subFields ?? []).forEach((sf) =>
                clearErrors(`${field.nome}.${i}.${sf.nome}`),
              );
            });
          }
        }
        // Reseta o valor se clearedValue estiver configurado
        if (field.clearedValue !== undefined) {
          const cv: unknown = field.clearedValue ?? "";
          if (values[field.nome] !== cv) {
            setValue(field.nome, cv, { shouldValidate: false });
          }
        }
      }
    }

    for (const container of containersWithConditional) {
      const containerVisible = evaluateFieldCondition(
        container.condicional,
        values,
        externalData,
      );
      if (!containerVisible) {
        if (container.repeatable && container.nome) {
          // Containers repetíveis: limpa erros de todos os itens presentes usando path indexado
          const items = Array.isArray(values[container.nome])
            ? (values[container.nome] as Record<string, unknown>[])
            : [];
          items.forEach((_, i) => {
            for (const field of container.campos) {
              clearErrors(`${container.nome}.${i}.${field.nome}`);
            }
          });
        } else {
          for (const field of container.campos) {
            clearErrors(field.nome);
            const cv =
              field.clearedValue !== undefined ? field.clearedValue : undefined;
            if (cv !== undefined && values[field.nome] !== cv) {
              setValue(field.nome, cv, { shouldValidate: false });
            }
          }
        }
      }
    }

    // Campos condicionais dentro de containers repetíveis — usa path indexado correto
    for (const { container, fields } of repeatableContainerConditionalFields) {
      const contNome = container.nome!;
      const items = Array.isArray(values[contNome])
        ? (values[contNome] as Record<string, unknown>[])
        : [];
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        for (const field of fields) {
          const visible = evaluateFieldCondition(
            field.condicional,
            item,
            externalData,
          );
          if (!visible) {
            clearErrors(`${contNome}.${idx}.${field.nome}`);
            if (field.clearedValue !== undefined) {
              const cv = (field.clearedValue ?? "") as
                | string
                | number
                | boolean
                | null;
              if (item[field.nome] !== cv) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setValue(`${contNome}.${idx}.${field.nome}` as any, cv, {
                  shouldValidate: false,
                });
              }
            }
          }
        }
      }
    }

    const firstRun = isFirstSetValuesRun.current;
    for (const field of allSetValueFields) {
      const visible = evaluateFieldCondition(
        field.condicional,
        values,
        externalData,
      );
      // Na primeira execução (mount/remount do step), usa visible como wasVisible
      // para não disparar setValues em campos já visíveis no carregamento inicial.
      const wasVisible = firstRun
        ? visible
        : (prevVisibilityRef.current[field.nome] ?? false);
      if (visible && !wasVisible && field.setValues?.length) {
        for (const sv of field.setValues) {
          const resolvedValue =
            typeof sv.valor === "string"
              ? interpolate(sv.valor, varsMap)
              : sv.valor;
          setValue(sv.campo, resolvedValue, { shouldValidate: false });
        }
      }
      prevVisibilityRef.current[field.nome] = visible;
    }
    isFirstSetValuesRun.current = false;
  }, [
    allWatchedValues,
    allConditionalFields,
    allSetValueFields,
    containersWithConditional,
    repeatableContainerConditionalFields,
    externalData,
    setValue,
    clearErrors,
  ]);

  const StepIcon = interpolated.icone
    ? ((icons as Record<string, unknown>)[interpolated.icone] as
        | icons.LucideIcon
        | undefined)
    : undefined;

  const requestSubmit = useMemo(
    () => () => {
      void methods.handleSubmit(onSubmit)();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSubmit],
  );

  return (
    <FormProvider {...methods}>
      <FormApiProvider
        value={{
          submitting: isSubmitting,
          warnings: fieldWarnings,
          requestSubmit,
        }}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              (e.target as HTMLElement).tagName === "INPUT"
            ) {
              e.preventDefault();
            }
          }}
        >
          <div className="space-y-6">
            {interpolated.showLabel !== false && (
              <div className="text-center space-y-2">
                {StepIcon && (
                  <div
                    className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "color-mix(in srgb, var(--t-primary) 12%, transparent)",
                    }}
                  >
                    <StepIcon
                      className="w-6 h-6"
                      style={{ color: "var(--t-primary)" }}
                    />
                  </div>
                )}
                <h2
                  className="text-2xl font-bold"
                  style={{ color: "var(--t-text)" }}
                >
                  {interpolated.titulo}
                </h2>
                {interpolated.descricao && (
                  <p className="text-sm text-muted-foreground">
                    {interpolated.descricao}
                  </p>
                )}
              </div>
            )}

            <StepRenderer
              step={interpolated}
              control={control}
              externalData={externalData}
            />

            <div className="flex items-center justify-between gap-4 pt-6 pb-2">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={stepIndex === 0 || isUploading}
                className={cn(
                  stepIndex > 0 &&
                    !isUploading &&
                    "border-primary/40 text-primary hover:bg-primary/5",
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>

              <span className="text-xs font-semibold tabular-nums sm:hidden text-muted-foreground">
                {stepIndex + 1}/{totalSteps}
              </span>

              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isLastStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isLastStep ? "Finalizar" : "Próximo"}
                </span>
              </Button>
            </div>
            {submitError && (
              <p className="text-sm text-destructive mt-2 text-center">
                {submitError}
              </p>
            )}
          </div>
        </form>
      </FormApiProvider>
    </FormProvider>
  );
};

export default StepForm;
