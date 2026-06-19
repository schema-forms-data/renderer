/**
 * DFTerms — Campo de aceite de termos e condições.
 *
 * Suporta:
 *  - Texto livre (termoTexto)
 *  - URL direta de PDF (termoPdfUrl)
 *  - Upload ID que resolve via `resolveTermsUploadUrl` do RendererContext
 *
 * Valor armazenado: "accepted" | ""
 */

import { useState, useEffect, useRef } from "react";
import { useController, type Control } from "react-hook-form";
import {
  ScrollText,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useRendererContext } from "../RendererContext";
import {
  Checkbox,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ScrollArea,
} from "@schema-forms-data/ui";

interface DFTermsProps {
  name: string;
  control: Control<Record<string, unknown>>;
  label?: string;
  termoTexto?: string;
  termoPdfUrl?: string;
  /** ID do upload armazenado. Quando presente, busca URL via `resolveTermsUploadUrl` do context. */
  termoPdfUploadId?: string;
}

const DFTerms = ({
  name,
  control,
  label,
  termoTexto,
  termoPdfUrl,
  termoPdfUploadId,
}: DFTermsProps) => {
  const { field, fieldState } = useController({ name, control });
  const { resolveTermsUploadUrl } = useRendererContext();
  const hasError = !!fieldState.error;
  const errorMsg = fieldState.error?.message;

  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);
  const [blobError, setBlobError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!termoPdfUploadId || !resolveTermsUploadUrl) {
      setUploadPreviewUrl(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    resolveTermsUploadUrl(termoPdfUploadId)
      .then((url) => {
        if (!cancelled) setUploadPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setUploadPreviewUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [termoPdfUploadId, resolveTermsUploadUrl]);

  const isAccepted = field.value === "accepted";
  const effectivePdfUrl = uploadPreviewUrl || termoPdfUrl || null;
  const hasContent = !!(termoTexto || effectivePdfUrl || termoPdfUploadId);
  const showPdf = !!effectivePdfUrl;

  // Converte a URL pré-assinada (S3/storage) em blob URL para evitar
  // que o Chrome bloqueie o iframe por X-Frame-Options/CSP do servidor de armazenamento.
  useEffect(() => {
    if (!dialogOpen || !effectivePdfUrl) {
      return;
    }
    let cancelled = false;
    setBlobLoading(true);
    setBlobError(null);
    setBlobUrl(null);

    fetch(effectivePdfUrl)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.blob();
      })
      .then((blob) => {
        if (!cancelled) {
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setBlobUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) setBlobError("Não foi possível carregar o PDF.");
      })
      .finally(() => {
        if (!cancelled) setBlobLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dialogOpen, effectivePdfUrl]);

  // Limpa blob URL ao desmontar
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "rounded-lg border p-4 space-y-4 transition-colors",
          hasError
            ? "border-destructive bg-destructive/5"
            : isAccepted
              ? "border-green-500 bg-green-500/5"
              : "border-input",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {label || "Termos e condições"}
            </span>
          </div>

          {hasContent ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={loadingPreview}
                >
                  {loadingPreview ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3 w-3" />
                  )}
                  Ler termos
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ScrollText className="h-4 w-4" />
                    Termos e condições
                  </DialogTitle>
                </DialogHeader>
                {showPdf ? (
                  <div className="flex-1 min-h-0 space-y-2">
                    {blobLoading && (
                      <div className="w-full h-[62vh] rounded border flex items-center justify-center bg-muted/20">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!blobLoading && blobError && (
                      <div className="w-full h-[62vh] rounded border flex flex-col items-center justify-center gap-2 bg-muted/20">
                        <AlertCircle className="h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {blobError}
                        </p>
                      </div>
                    )}
                    {!blobLoading && blobUrl && (
                      <iframe
                        src={blobUrl}
                        className="w-full h-[62vh] rounded border"
                        title="Termos e condições"
                      />
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      Prefere abrir fora?{" "}
                      <a
                        href={effectivePdfUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-primary"
                      >
                        Abrir em nova aba
                      </a>
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 max-h-[62vh] rounded border p-4 bg-muted/20">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {termoTexto}
                    </p>
                  </ScrollArea>
                )}
              </DialogContent>
            </Dialog>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              {termoPdfUploadId && loadingPreview
                ? "Carregando PDF..."
                : "Conteúdo não configurado"}
            </span>
          )}
        </div>

        {/* Aceite */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <Checkbox
            className="mt-0.5"
            checked={isAccepted}
            onCheckedChange={(checked) =>
              field.onChange(checked ? "accepted" : "")
            }
          />
          <span className="text-sm leading-snug flex-1">
            Li e aceito {label ? `"${label}"` : "os termos e condições"}
          </span>
          {isAccepted && (
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
          )}
        </label>
      </div>

      {hasError && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {errorMsg || "Você precisa aceitar os termos para continuar"}
        </div>
      )}
    </div>
  );
};

export default DFTerms;
