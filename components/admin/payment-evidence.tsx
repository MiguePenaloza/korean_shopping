"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getAdminEvidenceUrl,
  validateEvidenceFile,
  type AdminPaymentEvidence,
} from "@/lib/admin/orders";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function EvidenceLink({ evidence }: { evidence: AdminPaymentEvidence }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function prepareLink() {
    setLoading(true);
    setError(false);
    try {
      setUrl(await getAdminEvidenceUrl(evidence.storagePath));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-soft p-4">
      <p className="break-words font-bold">{evidence.originalFilename}</p>
      <p className="mt-1 text-xs leading-5 text-muted">
        {formatSize(evidence.sizeBytes)} · Adjuntado por {evidence.uploadedByName} ·{" "}
        {formatDate(evidence.createdAt)}
      </p>
      {url ? (
        <a
          className="mt-3 inline-flex min-h-11 items-center font-bold text-accent"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          Abrir comprobante privado
        </a>
      ) : (
        <Button
          className="mt-3"
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={() => void prepareLink()}
        >
          {loading ? "Preparando…" : "Generar enlace privado"}
        </Button>
      )}
      {error ? (
        <p className="mt-2 text-sm font-semibold text-warning" role="alert">
          No pudimos preparar el enlace. Intenta nuevamente.
        </p>
      ) : null}
    </div>
  );
}

type PaymentEvidenceProps = {
  evidence: AdminPaymentEvidence[];
  selectedFile: File | null;
  disabled?: boolean;
  uploading?: boolean;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
};

export function PaymentEvidence({
  disabled = false,
  evidence,
  onFileChange,
  onUpload,
  selectedFile,
  uploading = false,
}: PaymentEvidenceProps) {
  const [validationMessage, setValidationMessage] = useState("");

  function selectFile(file: File | null) {
    if (!file) {
      setValidationMessage("");
      onFileChange(null);
      return;
    }
    const validation = validateEvidenceFile(file);
    if (validation) {
      setValidationMessage(validation);
      onFileChange(null);
      return;
    }
    setValidationMessage("");
    onFileChange(file);
  }

  return (
    <div>
      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-soft p-5 text-center">
        <span className="text-2xl" aria-hidden="true">
          ＋
        </span>
        <strong className="mt-2">
          {selectedFile?.name || "Seleccionar comprobante de pago"}
        </strong>
        <span className="mt-1 text-sm text-muted">
          Imagen privada JPEG, PNG o WebP · máximo 10 MB
        </span>
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
        />
      </label>
      {validationMessage ? (
        <p className="mt-3 text-sm font-bold text-warning" role="alert">
          {validationMessage}
        </p>
      ) : null}
      {selectedFile ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={disabled || uploading}
            onClick={onUpload}
          >
            {uploading ? "Adjuntando…" : "Adjuntar ahora"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled || uploading}
            onClick={() => selectFile(null)}
          >
            Quitar selección
          </Button>
        </div>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-muted">
        También puedes dejar la imagen seleccionada y adjuntarla al marcar el pedido como
        pagado. Los comprobantes no se eliminan automáticamente.
      </p>

      <div className="mt-5 space-y-3">
        {evidence.length ? (
          evidence.map((item) => <EvidenceLink key={item.id} evidence={item} />)
        ) : (
          <p className="rounded-xl bg-surface-soft p-4 text-sm text-muted">
            Este pedido todavía no tiene comprobantes adjuntos.
          </p>
        )}
      </div>
    </div>
  );
}
