/**
 * DFFileUpload — Upload de arquivo.
 * Usa `uploadFile` do RendererContext.
 * Se não fornecido, exibe aviso de preview.
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { useController, type Control } from "react-hook-form";
import { fileTypeFromBlob } from "file-type";
import { useRendererContext } from "../RendererContext";
import { cn } from "@schema-forms-data/ui";

interface DFFileUploadProps {
  name: string;
  control: Control<Record<string, unknown>>;
  disabled?: boolean;
  campo?: string;
  fileTypes?: string[];
  maxFileSize?: number;
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; fileName: string; progress: number }
  | { status: "done"; uploadId: string; fileName: string; size: number }
  | { status: "error"; message: string };

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DFFileUpload = ({
  name,
  control,
  disabled,
  campo,
  fileTypes,
  maxFileSize,
}: DFFileUploadProps) => {
  const { field, fieldState } = useController({ name, control });
  const { uploadFile, deleteUploadedFile, onUploadStart, onUploadEnd } =
    useRendererContext();
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const mountedRef = useRef(true);
  const onUploadStartRef = useRef(onUploadStart);
  onUploadStartRef.current = onUploadStart;
  const onUploadEndRef = useRef(onUploadEnd);
  onUploadEndRef.current = onUploadEnd;
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const currentUploadId =
    typeof field.value === "string" && field.value ? field.value : null;

  const processFile = useCallback(
    async (file: File) => {
      if (fileTypes && fileTypes.length > 0) {
        // Detecta o tipo real via magic bytes (ignora extensão e mime declarados pelo browser)
        const detected = await fileTypeFromBlob(file);
        const detectedExt = detected?.ext ?? "";
        const detectedMime = detected?.mime ?? "";
        // Fallback para extensão do nome quando file-type não reconhece o formato
        // (ex: arquivos de texto simples — .txt, .csv — não têm magic bytes)
        const fallbackExt = file.name.split(".").pop()?.toLowerCase() ?? "";
        const fallbackMime = file.type.toLowerCase();

        const allowed = fileTypes.some((t) => {
          const type = t.toLowerCase();
          // Compara contra magic bytes primeiro
          if (detectedExt && (type === detectedExt || type === detectedMime))
            return true;
          // Suporta wildcards do tipo "image/*" com tipo detectado
          if (
            detectedMime &&
            type.endsWith("/*") &&
            detectedMime.startsWith(type.slice(0, -1))
          )
            return true;
          // Fallback para extensão/mime declarados (apenas quando file-type não detectou)
          if (!detectedExt) {
            if (type === fallbackExt || type === fallbackMime) return true;
            if (
              type.endsWith("/*") &&
              fallbackMime.startsWith(type.slice(0, -1))
            )
              return true;
          }
          return false;
        });
        if (!allowed) {
          setUploadState({
            status: "error",
            message: `Tipo de arquivo não permitido. Permitidos: ${fileTypes.join(", ")}`,
          });
          return;
        }
      }
      if (maxFileSize && file.size > maxFileSize) {
        setUploadState({
          status: "error",
          message: `Arquivo muito grande. Tamanho máximo: ${formatSize(maxFileSize)}`,
        });
        return;
      }
      if (!uploadFile) {
        setUploadState({
          status: "error",
          message: "Preview: upload não disponível sem configuração.",
        });
        return;
      }
      setUploadState({ status: "uploading", fileName: file.name, progress: 0 });
      onUploadStartRef.current?.();
      try {
        // Deleta o arquivo anterior do storage antes de fazer o novo upload,
        // evitando arquivos órfãos (mesma lógica do builder — processTermsPdf).
        if (currentUploadId && deleteUploadedFile) {
          try {
            await deleteUploadedFile(currentUploadId);
          } catch {
            /* ignora erro de delete para não bloquear o novo upload */
          }
        }
        const uploadId = await uploadFile(file, campo ?? name, (percent) => {
          if (!mountedRef.current) return;
          setUploadState((prev) =>
            prev.status === "uploading"
              ? { ...prev, progress: Math.min(100, percent) }
              : prev,
          );
        });
        if (!mountedRef.current) return;
        field.onChange(uploadId);
        setUploadState({
          status: "done",
          uploadId,
          fileName: file.name,
          size: file.size,
        });
      } catch {
        if (!mountedRef.current) return;
        setUploadState({
          status: "error",
          message: "Falha no upload. Tente novamente.",
        });
      } finally {
        if (mountedRef.current) onUploadEndRef.current?.();
      }
    },
    [
      uploadFile,
      deleteUploadedFile,
      currentUploadId,
      campo,
      name,
      field,
      fileTypes,
      maxFileSize,
    ],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  const handleRemove = useCallback(() => {
    if (currentUploadId && deleteUploadedFile) {
      onUploadStartRef.current?.();
      deleteUploadedFile(currentUploadId)
        .catch(() => {
          /* ignora erro de delete */
        })
        .finally(() => {
          onUploadEndRef.current?.();
        });
    }
    field.onChange("");
    setUploadState({ status: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }, [field, currentUploadId, deleteUploadedFile]);

  // ── estado "done" ──────────────────────────────────────────────────────────
  const isDone =
    uploadState.status === "done" ||
    (uploadState.status === "idle" && !!currentUploadId);

  if (isDone) {
    const fileName =
      uploadState.status === "done" ? uploadState.fileName : "Arquivo enviado";
    const size = uploadState.status === "done" ? uploadState.size : null;

    return (
      <div className="flex items-center justify-between rounded-lg border border-green-500 bg-green-500/5 px-4 py-3 gap-2">
        <svg
          className="shrink-0 text-green-500"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            width="20"
            height="20"
            rx="4"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path
            d="M5 10.5L8.5 14L15 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-medium truncate flex-1">{fileName}</span>
        {size !== null && (
          <span className="text-xs text-muted-foreground shrink-0">
            {formatSize(size)}
          </span>
        )}
        {!disabled && (
          <button
            type="button"
            onClick={handleRemove}
            className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remover arquivo"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  // ── estado "uploading" ─────────────────────────────────────────────────────
  if (uploadState.status === "uploading") {
    const { fileName, progress } = uploadState;
    return (
      <div className="rounded-lg border border-input px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate flex-1">
            {fileName}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            {progress}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-200 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // ── estado "idle" / "error" ────────────────────────────────────────────────
  const isError = uploadState.status === "error";

  return (
    <div className="space-y-1">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Selecionar arquivo"
        className={cn(
          "flex items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : isError || fieldState.error
              ? "border-destructive bg-destructive/5"
              : "border-input hover:border-muted-foreground hover:bg-muted/20",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={
          disabled
            ? undefined
            : (e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) processFile(f);
              }
        }
        onBlur={field.onBlur}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileChange}
          disabled={disabled}
          className="sr-only"
        />
        <span className="text-sm text-muted-foreground">
          {isDragging ? "Solte o arquivo aqui" : "Clique ou arraste um arquivo"}
        </span>
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          {(uploadState as Extract<UploadState, { status: "error" }>).message}
          {" · "}
          <button
            type="button"
            className="underline hover:no-underline"
            onClick={() => setUploadState({ status: "idle" })}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {!isError && fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
};

export default DFFileUpload;
