/**
 * FormRenderer — Componente principal do SchemaForms renderer.
 *
 * Orquestra o fluxo de steps, validação por step, e injeta
 * o RendererContext com as funções de integração.
 *
 * @example
 * ```tsx
 * <FormRenderer
 *   schema={schema}
 *   template="moderno"
 *   formTitle="Inscrição"
 *   externalData={{ 'evento.nome': 'Acampamento 2025', 'evento.valor': 5000 }}
 *   uploadFile={(file, fieldName, onProgress) => myApi.uploadFile(file, fieldName, onProgress)}
 *   deleteUploadedFile={(uploadId) => myApi.deleteUpload(uploadId)}
 *   cepLookup={(cep) => myApi.lookupCep(cep)}
 *   resolveTermsUploadUrl={(uploadId) => myApi.getPreviewUrl(uploadId)}
 *   onSubmitStep={(stepIndex, data) => myApi.saveStep(stepIndex, data)}
 *   onComplete={(data) => myApi.finalize(data)}
 * />
 * ```
 */

import { useState, useCallback, useMemo, useRef, startTransition } from "react";
import {
  TemplateProvider,
  getTemplateConfig,
} from "@schema-forms-data/templates";
import RendererContext, { type RendererContextValue } from "../RendererContext";
import StepForm from "./StepForm";
import DefaultStepIndicator from "./DefaultStepIndicator";
import { buildStepDefaults } from "./utils/buildStepDefaults";
import { stripHiddenFields, FieldType } from "@schema-forms-data/core";
import type { FormRendererProps } from "./types";

const FormRenderer = ({
  schema,
  initialValues = {},
  initialStep = 0,
  onSubmitStep,
  onComplete,
  template,
  formTitle,
  externalData = {},
  fieldErrors = {},
  uploadFile,
  deleteUploadedFile,
  cepLookup,
  resolveTermsUploadUrl,
  fieldResolvers,
  validatorMapper,
  componentMapper,
  paymentMethodOptions,
  onValuesChange,
  className,
  StepIndicator = DefaultStepIndicator,
}: FormRendererProps) => {
  const [currentStep, setCurrentStep] = useState(() => initialStep);
  const [formData, setFormData] = useState<Record<string, unknown>>({
    ...initialValues,
  });
  const [maxReachedStep, setMaxReachedStep] = useState(() => initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldWarnings, setFieldWarnings] = useState<Record<string, string>>(
    {},
  );
  const [isUploading, setIsUploading] = useState(false);
  const activeUploadsRef = useRef(0);
  const handleUploadStart = useCallback(() => {
    activeUploadsRef.current += 1;
    if (activeUploadsRef.current === 1)
      startTransition(() => setIsUploading(true));
  }, []);
  const handleUploadEnd = useCallback(() => {
    activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
    if (activeUploadsRef.current === 0)
      startTransition(() => setIsUploading(false));
  }, []);

  // Estabiliza resolveTermsUploadUrl: garante referência estável no context mesmo
  // quando o pai passa uma função inline (sem useCallback). Sem isso, DFTerms
  // re-dispara o useEffect a cada re-render do pai e entra em loop infinito de requests.
  const resolveTermsUploadUrlRef = useRef(resolveTermsUploadUrl);
  resolveTermsUploadUrlRef.current = resolveTermsUploadUrl;
  const stableResolveTermsUploadUrl = useCallback(
    (uploadId: string) => resolveTermsUploadUrlRef.current!(uploadId),
    [],
  );
  // Usa apenas a presença/ausência como dep do useMemo — evita recriar o context
  // a cada render quando o pai passa uma nova referência de função inline.
  const hasResolveTermsUploadUrl = !!resolveTermsUploadUrl;

  // Mesma estabilização para deleteUploadedFile — evita re-renders desnecessários
  // no DFFileUpload quando o pai passa função inline.
  const deleteUploadedFileRef = useRef(deleteUploadedFile);
  deleteUploadedFileRef.current = deleteUploadedFile;
  const stableDeleteUploadedFile = useCallback(
    (uploadId: string) => deleteUploadedFileRef.current!(uploadId),
    [],
  );
  const hasDeleteUploadedFile = !!deleteUploadedFile;

  // Chave estável baseada no conteúdo de externalData: evita chamar JSON.stringify
  // inline em múltiplos useMemo e reconstroi dependentes apenas quando o conteúdo muda
  const externalDataKey = useMemo(
    () => JSON.stringify(externalData),
    [externalData],
  );

  const stepConfigKey = useMemo(
    () => JSON.stringify(schema.stepConfig),
    [schema.stepConfig],
  );
  const templateConfig = useMemo(() => {
    const base = getTemplateConfig(template);
    if (!schema.stepConfig) return base;
    return { ...base, layout: { ...base.layout, ...schema.stepConfig } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, stepConfigKey]);
  const sortedSteps = useMemo(
    () => [...schema.steps].sort((a, b) => a.ordem - b.ordem),
    [schema.steps],
  );

  // Nome do campo de participação (se houver) — usado pelo DFPaymentMethod para
  // observar a participação automaticamente, sem depender de `relatedFieldName`.
  const participationFieldName = useMemo(() => {
    for (const s of schema.steps ?? []) {
      for (const c of s.containers ?? []) {
        for (const f of c.campos ?? []) {
          if (f.tipo === FieldType.PARTICIPATION_TYPE) return f.nome;
        }
      }
    }
    return undefined;
  }, [schema.steps]);
  const totalSteps = sortedSteps.length;
  // Guard: step fica null quando o schema não tem steps (evita crash em buildStepDefaults)
  const step =
    totalSteps > 0 ? sortedSteps[Math.min(currentStep, totalSteps - 1)]! : null;

  const stepDefaults = useMemo(
    () => (step ? buildStepDefaults(step, formData, externalData) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, formData, externalDataKey],
  );

  const rendererContextValue: RendererContextValue = useMemo(
    () => ({
      uploadFile,
      deleteUploadedFile: hasDeleteUploadedFile
        ? stableDeleteUploadedFile
        : undefined,
      cepLookup,
      resolveTermsUploadUrl: hasResolveTermsUploadUrl
        ? stableResolveTermsUploadUrl
        : undefined,
      externalData,
      fieldResolvers,
      validatorMapper,
      fieldWarnings,
      componentMapper,
      paymentMethodOptions,
      participationFieldName,
      onUploadStart: handleUploadStart,
      onUploadEnd: handleUploadEnd,
    }),
    [
      uploadFile,
      hasDeleteUploadedFile,
      stableDeleteUploadedFile,
      cepLookup,
      stableResolveTermsUploadUrl,
      hasResolveTermsUploadUrl,
      fieldResolvers,
      validatorMapper,
      fieldWarnings,
      componentMapper,
      paymentMethodOptions,
      participationFieldName,
      handleUploadStart,
      handleUploadEnd,
      externalDataKey,
    ],
  );

  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      if (isSubmitting) return; // previne duplo-submit (ex: clique rápido ou chamada programática)
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        // Remove campos ocultos (condicionais não satisfeitas) do payload antes de submeter.
        // Também coleta uploadIds de campos FILE ocultos para deletar do storage.
        const { cleaned, fileIdsToDelete } = stripHiddenFields(
          step!,
          values,
          externalData,
        );
        if (fileIdsToDelete.length && deleteUploadedFile) {
          await Promise.allSettled(
            fileIdsToDelete.map((id) => deleteUploadedFile(id)),
          );
        }
        const merged = { ...formData, ...cleaned };
        setFormData(merged);
        if (onSubmitStep) await onSubmitStep(currentStep, cleaned);
        if (currentStep === totalSteps - 1) {
          if (onComplete) await onComplete(merged);
        } else {
          const next = currentStep + 1;
          setCurrentStep(next);
          setMaxReachedStep((prev) => Math.max(prev, next));
        }
      } catch (err) {
        console.error("[FormRenderer] Submit error:", err);
        const msg =
          err instanceof Error
            ? err.message
            : "Ocorreu um erro. Tente novamente.";
        setSubmitError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      currentStep,
      formData,
      isSubmitting,
      totalSteps,
      onSubmitStep,
      onComplete,
      step,
      externalData,
      deleteUploadedFile,
    ],
  );

  const handleBack = useCallback(() => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  }, [currentStep]);

  // Retorno antecipado após todos os hooks: schema sem steps não tem nada para renderizar
  if (!step) {
    return (
      <RendererContext.Provider value={rendererContextValue}>
        <TemplateProvider
          config={templateConfig}
          className={`min-h-dvh ${templateConfig.wrapperClass ?? ""} ${className ?? ""}`}
          renderWrapper
        >
          <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 text-center text-muted-foreground">
            Nenhum step configurado.
          </div>
        </TemplateProvider>
      </RendererContext.Provider>
    );
  }

  const titleStyle = templateConfig.layout.eventTitleStyle ?? "bar";
  const isVerticalSidebar =
    (templateConfig.layout.stepIndicatorOrientation ?? "horizontal") ===
    "vertical";

  const stepIndicatorEl =
    totalSteps >= 1 ? (
      <StepIndicator
        steps={sortedSteps.map((s) => ({
          id: s.id,
          label: s.titulo,
          icone: s.icone,
        }))}
        currentStep={currentStep}
        onStepClick={(i) => {
          if (!isUploading && i !== currentStep && i <= maxReachedStep) {
            setCurrentStep(i);
          }
        }}
      />
    ) : null;

  return (
    <RendererContext.Provider value={rendererContextValue}>
      <TemplateProvider
        config={templateConfig}
        className={`min-h-dvh ${templateConfig.wrapperClass ?? ""} ${className ?? ""}`}
        renderWrapper
      >
        <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6">
          {formTitle && titleStyle === "bar" && (
            <div className="w-full text-center text-sm font-medium py-2.5 px-4 mb-6 rounded-lg border border-input text-muted-foreground bg-muted/30">
              {formTitle}
            </div>
          )}
          {formTitle && titleStyle === "inline" && (
            <div className="text-center mb-6">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: "var(--t-text-muted)" }}
              >
                Inscrição
              </p>
              <h1
                className="text-2xl font-bold"
                style={{ color: "var(--t-text)" }}
              >
                {formTitle}
              </h1>
              <div
                className="h-0.5 w-12 mx-auto mt-3 rounded-full"
                style={{ background: "var(--t-primary)" }}
              />
            </div>
          )}

          {isVerticalSidebar ? (
            /* Sidebar layout — indicator on the left, form on the right */
            <div className="flex gap-6 items-start">
              <div className="hidden sm:block shrink-0 w-44 pt-1">
                {stepIndicatorEl}
              </div>
              <div className="flex-1 min-w-0">
                {/* Mobile: indicator on top */}
                <div className="sm:hidden mb-6">{stepIndicatorEl}</div>
                <StepForm
                  key={currentStep}
                  stepIndex={currentStep}
                  totalSteps={totalSteps}
                  step={step}
                  defaultValues={stepDefaults}
                  externalData={externalData}
                  fieldErrors={fieldErrors}
                  isSubmitting={isSubmitting}
                  isUploading={isUploading}
                  submitError={submitError}
                  validatorMapper={validatorMapper}
                  onWarningsChange={setFieldWarnings}
                  onValuesChange={onValuesChange}
                  onSubmit={handleSubmit}
                  onBack={handleBack}
                />
              </div>
            </div>
          ) : (
            /* Default top layout */
            <>
              {stepIndicatorEl && <div className="mb-8">{stepIndicatorEl}</div>}
              <StepForm
                key={currentStep}
                stepIndex={currentStep}
                totalSteps={totalSteps}
                step={step}
                defaultValues={stepDefaults}
                externalData={externalData}
                fieldErrors={fieldErrors}
                isSubmitting={isSubmitting}
                isUploading={isUploading}
                submitError={submitError}
                validatorMapper={validatorMapper}
                onWarningsChange={setFieldWarnings}
                onValuesChange={onValuesChange}
                onSubmit={handleSubmit}
                onBack={handleBack}
              />
            </>
          )}
        </div>
      </TemplateProvider>
    </RendererContext.Provider>
  );
};

export default FormRenderer;
export type { FormRendererProps, StepIndicatorProps } from "./types";
