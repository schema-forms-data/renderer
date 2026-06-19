/**
 * DefaultStepIndicator — Indicador de steps unificado com suporte a múltiplas variantes.
 *
 * Variantes controladas por config.layout.stepIndicatorVariant:
 *  - 'numbers'       — círculos numerados (padrão anterior)
 *  - 'icons'         — ícone lucide no círculo, sem rótulo
 *  - 'icons-labeled' — ícone + nome do step abaixo + linha conectora (como nas fotos)
 *
 * Posição controlada por config.layout.stepIndicatorPosition:
 *  - 'top-center' — centralizado (justify-center)
 *  - 'top-left'   — alinhado à esquerda (justify-start)
 *
 * Cores via CSS custom properties (--t-primary, --t-text, etc.) injetadas pelo TemplateProvider.
 */

import { cn } from "@schema-forms-data/ui";
import { useTemplate } from "@schema-forms-data/templates";
import * as LucideIcons from "lucide-react";
import { Check, CircleDot } from "lucide-react";
import type { StepIndicatorProps } from "./types";

interface StepInfo {
  id: string;
  label?: string;
  icone?: string;
}

const getLucideIcon = (name?: string): LucideIcons.LucideIcon | undefined => {
  if (!name) return undefined;
  return (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[
    name
  ];
};

// ─── Variants ───────────────────────────────────────────────────────────────

const NumbersVariant = ({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: StepInfo[];
  currentStep: number;
  onStepClick?: (i: number) => void;
}) => (
  <div className="flex items-center justify-center gap-2 flex-wrap">
    {steps.map((s, i) => (
      <div
        key={s.id}
        role={onStepClick ? "button" : undefined}
        tabIndex={onStepClick ? 0 : undefined}
        onClick={() => onStepClick?.(i)}
        onKeyDown={(e) => e.key === "Enter" && onStepClick?.(i)}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
          onStepClick && "cursor-pointer hover:opacity-80",
        )}
        style={
          i === currentStep
            ? {
                background: "var(--t-primary)",
                color: "#ffffff",
                boxShadow:
                  "0 0 0 3px color-mix(in srgb, var(--t-primary) 30%, transparent)",
              }
            : i < currentStep
              ? {
                  background: "#22c55e",
                  color: "#ffffff",
                }
              : {
                  background: "hsl(var(--muted))",
                  color: "hsl(var(--muted-foreground))",
                }
        }
      >
        {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
      </div>
    ))}
  </div>
);

const IconsVariant = ({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: StepInfo[];
  currentStep: number;
  onStepClick?: (i: number) => void;
}) => (
  <div className="flex items-center justify-center gap-2 flex-wrap">
    {steps.map((s, i) => {
      const Icon = getLucideIcon(s.icone) ?? CircleDot;
      return (
        <div
          key={s.id}
          role={onStepClick ? "button" : undefined}
          tabIndex={onStepClick ? 0 : undefined}
          onClick={() => onStepClick?.(i)}
          onKeyDown={(e) => e.key === "Enter" && onStepClick?.(i)}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0",
            onStepClick && "cursor-pointer hover:opacity-80",
          )}
          style={
            i === currentStep
              ? {
                  background: "var(--t-primary)",
                  color: "#ffffff",
                  boxShadow:
                    "0 0 0 3px color-mix(in srgb, var(--t-primary) 30%, transparent)",
                }
              : i < currentStep
                ? {
                    background: "#22c55e",
                    color: "#ffffff",
                  }
                : {
                    background: "hsl(var(--muted))",
                    color: "hsl(var(--muted-foreground))",
                  }
          }
        >
          {i < currentStep ? (
            <Check className="w-4 h-4" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>
      );
    })}
  </div>
);

const IconsLabeledVariant = ({
  steps,
  currentStep,
  position,
  orientation = "horizontal",
  onStepClick,
}: {
  steps: StepInfo[];
  currentStep: number;
  position: "top-center" | "top-left";
  orientation?: "horizontal" | "vertical";
  onStepClick?: (i: number) => void;
}) => {
  if (orientation === "vertical") {
    return (
      <div className="flex flex-col gap-0">
        {steps.map((s, i) => {
          const Icon = getLucideIcon(s.icone) ?? CircleDot;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          const isLast = i === steps.length - 1;
          return (
            <div key={s.id} className="flex items-start gap-3">
              {/* Linha vertical + bolinha */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onStepClick?.(i)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0",
                    onStepClick && "cursor-pointer hover:opacity-80",
                  )}
                  style={
                    isActive
                      ? {
                          background: "var(--t-primary)",
                          color: "#fff",
                          boxShadow:
                            "0 0 10px color-mix(in srgb, var(--t-primary) 50%, transparent)",
                        }
                      : isDone
                        ? { background: "#22c55e", color: "#fff" }
                        : {
                            background:
                              "color-mix(in srgb, var(--t-text) 8%, transparent)",
                            color: "var(--t-text-muted)",
                            border:
                              "1.5px solid color-mix(in srgb, var(--t-border) 60%, transparent)",
                          }
                  }
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </button>
                {!isLast && (
                  <div
                    className="w-[2px] my-1"
                    style={{
                      height: "24px",
                      background: isDone
                        ? "#22c55e"
                        : "color-mix(in srgb, var(--t-border) 50%, transparent)",
                    }}
                  />
                )}
              </div>
              {/* Label */}
              <span
                className="text-sm font-medium leading-tight mt-1.5"
                style={
                  isActive
                    ? { color: "var(--t-primary)" }
                    : isDone
                      ? { color: "#16a34a" }
                      : { color: "var(--t-text-muted)" }
                }
              >
                {s.label ?? s.id}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal (default)
  return (
    <div className="w-full flex items-start">
      {steps.map((s, i) => {
        const Icon = getLucideIcon(s.icone) ?? CircleDot;
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        const isLast = i === steps.length - 1;

        return (
          <div
            key={s.id}
            className={cn("flex items-start", !isLast && "flex-1")}
          >
            {/* Step bubble + label */}
            <div className="flex flex-col items-center gap-1.5 w-[56px] shrink-0 mx-auto">
              <button
                type="button"
                onClick={() => onStepClick?.(i)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
                  onStepClick && "cursor-pointer hover:opacity-80",
                )}
                style={
                  isActive
                    ? {
                        background: "var(--t-primary)",
                        color: "#ffffff",
                        boxShadow:
                          "0 0 12px color-mix(in srgb, var(--t-primary) 50%, transparent)",
                      }
                    : isDone
                      ? {
                          background: "#22c55e",
                          color: "#ffffff",
                        }
                      : {
                          background:
                            "color-mix(in srgb, var(--t-text) 8%, transparent)",
                          color: "var(--t-text-muted)",
                          border:
                            "1.5px solid color-mix(in srgb, var(--t-border) 60%, transparent)",
                        }
                }
              >
                {isDone ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </button>
              <span
                className="text-[10px] font-medium text-center leading-tight line-clamp-2 px-0.5"
                style={
                  isActive
                    ? { color: "var(--t-primary)" }
                    : isDone
                      ? { color: "#16a34a" }
                      : { color: "var(--t-text-muted)" }
                }
              >
                {s.label ?? s.id}
              </span>
            </div>

            {/* Connecting line between steps */}
            {!isLast && (
              <div
                className="flex-1 h-[1.5px] mt-5 mx-1"
                style={{
                  background: isDone
                    ? "linear-gradient(90deg, var(--t-primary), color-mix(in srgb, var(--t-primary) 40%, transparent))"
                    : "color-mix(in srgb, var(--t-border) 50%, transparent)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const DefaultStepIndicator = ({
  steps,
  currentStep,
  onStepClick,
  className,
  forceShow,
}: StepIndicatorProps) => {
  const config = useTemplate();
  const { layout } = config;

  if (!layout.showStepIndicators || (steps.length <= 1 && !forceShow))
    return null;

  const variant = layout.stepIndicatorVariant ?? "numbers";
  const position = layout.stepIndicatorPosition ?? "top-center";
  const orientation = layout.stepIndicatorOrientation ?? "horizontal";
  const progress = ((currentStep + 1) / steps.length) * 100;

  const currentStepInfo = steps[currentStep];
  const CurrentIcon = getLucideIcon(currentStepInfo?.icone) ?? CircleDot;

  const progressBar = (
    <div
      className="h-1 rounded-full overflow-hidden"
      style={{
        background: "color-mix(in srgb, var(--t-primary) 15%, transparent)",
      }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${progress}%`,
          background:
            "linear-gradient(90deg, var(--t-primary), var(--t-accent))",
        }}
      />
    </div>
  );

  /* ── Mobile: ícone + nome do step atual + "Passo X de Y" + barra ── */
  const mobileIndicator = (
    <div className="block sm:hidden space-y-2">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--t-primary)", color: "#fff" }}
        >
          <CurrentIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p
            className="text-sm font-semibold leading-tight truncate"
            style={{ color: "var(--t-text)" }}
          >
            {currentStepInfo?.label ?? currentStepInfo?.id}
          </p>
          <p
            className="text-xs leading-tight"
            style={{ color: "var(--t-text-muted)" }}
          >
            Passo {currentStep + 1} de {steps.length}
          </p>
        </div>
      </div>
      {progressBar}
    </div>
  );

  /* ── Desktop: variante do template ── */
  const desktopIndicators = (
    <div className="hidden sm:block">
      {variant === "numbers" && (
        <NumbersVariant
          steps={steps}
          currentStep={currentStep}
          onStepClick={onStepClick}
        />
      )}
      {variant === "icons" && (
        <IconsVariant
          steps={steps}
          currentStep={currentStep}
          onStepClick={onStepClick}
        />
      )}
      {variant === "icons-labeled" && (
        <IconsLabeledVariant
          steps={steps}
          currentStep={currentStep}
          position={position}
          orientation={orientation}
          onStepClick={onStepClick}
        />
      )}
    </div>
  );

  const desktopProgressBar = layout.showProgressBar ? (
    <div className="hidden sm:block">{progressBar}</div>
  ) : null;

  if (orientation === "vertical") {
    return (
      <div className={cn("flex gap-6 items-start", className)}>
        {mobileIndicator}
        <div className="hidden sm:flex gap-6 items-start shrink-0">
          {desktopIndicators}
          {desktopProgressBar && (
            <div className="flex-1 pt-4">{desktopProgressBar}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {mobileIndicator}
      <div className="hidden sm:block space-y-3">
        {desktopIndicators}
        {desktopProgressBar}
      </div>
    </div>
  );
};

export default DefaultStepIndicator;
