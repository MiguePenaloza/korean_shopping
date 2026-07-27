"use client";

import { useState } from "react";

export function PaymentEvidence() {
  const [fileName, setFileName] = useState("");
  return (
    <div>
      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-soft p-5 text-center">
        <span className="text-2xl">＋</span>
        <strong className="mt-2">{fileName || "Adjuntar comprobante de pago"}</strong>
        <span className="mt-1 text-sm text-muted">Imagen privada · prototipo visual</span>
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
        />
      </label>
      {fileName && (
        <p className="mt-3 text-sm font-bold text-success" role="status">
          Archivo listo para adjuntar: {fileName}
        </p>
      )}
    </div>
  );
}
