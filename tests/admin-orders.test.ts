import { describe, expect, it } from "vitest";

import {
  MAX_EVIDENCE_BYTES,
  orderStatusLabels,
  paymentStatusLabels,
  validateEvidenceFile,
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

  it("provides Spanish labels for administrative states", () => {
    expect(orderStatusLabels.refund_pending).toBe("Reembolso pendiente");
    expect(orderStatusLabels.expired).toBe("Vencido");
    expect(paymentStatusLabels.payment_reported).toBe("Pago avisado");
    expect(paymentStatusLabels.refunded).toBe("Reembolsado");
  });
});
