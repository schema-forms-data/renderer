import React from "react";
import { cn } from "@schema-forms-data/ui";
import { useTemplate } from "@schema-forms-data/templates";

export const useContainerStyle = () => {
  const tmpl = useTemplate();
  const style = tmpl.layout.containerStyle;
  const roundness = tmpl.layout.roundness ?? "rounded-xl";

  const wrapperClass = cn(
    "overflow-hidden",
    roundness,
    style === "card" ? "border" : "",
    style === "bordered" ? "border" : "",
    style === "glassmorphism" ? "backdrop-blur-sm" : "",
  );

  const wrapperStyle: React.CSSProperties =
    style === "glassmorphism"
      ? {
          background: "var(--t-surface)",
          borderColor: "var(--t-border)",
          borderWidth: "1px",
          borderStyle: "solid",
        }
      : {};

  const headerClass = cn(
    "border-b px-6 py-4",
    style === "flat" ? "border-transparent" : "",
  );

  const headerStyle: React.CSSProperties =
    style === "glassmorphism" ? { borderColor: "var(--t-border)" } : {};

  return { wrapperClass, wrapperStyle, headerClass, headerStyle, tmpl };
};
