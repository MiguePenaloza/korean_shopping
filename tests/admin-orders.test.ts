import { describe, expect, it } from "vitest";

import {
  MAX_EVIDENCE_BYTES,
  orderStatusLabels,
  paymentStatusLabels,
  validateEvidenceFile,
  validateEvidenceFileContent,
} from "@/lib/admin/orders";

describe("administrator order helpers", () => {
  it("accepts only supported private evidence images", () => {
    expect(validateEvidenceFile({ type: "image/jpeg", size: 128_000 })).toBeNull();
    expect(validateEvidenceFile({ type: "image/png", size: MAX_EVIDENCE_BYTES })).toBe(
      null,
    );
    expect(validateEvidenceFile({ type: "application/pdf", size: 128_000 })).toBe(
      "Usa una imagen JPEG, PNG o WebP.",
    );
  });

  it("rejects empty and oversized evidence", () => {
    expect(validateEvidenceFile({ type: "image/webp", size: 0 })).toBe(
      "La imagen debe pesar como máximo 10 MB.",
    );
    expect(
      validateEvidenceFile({
        type: "image/webp",
        size: MAX_EVIDENCE_BYTES + 1,
      }),
    ).toBe("La imagen debe pesar como máximo 10 MB.");
  });

  it("verifies image signatures instead of trusting the declared MIME type", async () => {
    const png = new Blob(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      {
        type: "image/png",
      },
    );
    const disguisedText = new Blob(["not an image"], { type: "image/png" });

    await expect(validateEvidenceFileContent(png)).resolves.toBeNull();
    await expect(validateEvidenceFileContent(disguisedText)).resolves.toContain(
      "no coincide",
    );
  });

  it("provides Spanish labels for administrative states", () => {
    expect(orderStatusLabels.refund_pending).toBe("Reembolso pendiente");
    expect(orderStatusLabels.expired).toBe("Vencido");
    expect(paymentStatusLabels.payment_reported).toBe("Pago avisado");
    expect(paymentStatusLabels.refunded).toBe("Reembolsado");
  });
});
