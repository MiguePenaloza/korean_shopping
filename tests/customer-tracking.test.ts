import { describe, expect, it } from "vitest";

import {
  customerOrderPresentation,
  customerOrderStatusLabels,
  customerPaymentStatusLabels,
  customerTimelineLabel,
  type CustomerOrderHistoryEntry,
} from "@/lib/orders/tracking";

function history(
  overrides: Partial<CustomerOrderHistoryEntry>,
): CustomerOrderHistoryEntry {
  return {
    fromStatus: "pending_payment",
    toStatus: "pending_payment",
    fromPaymentStatus: "awaiting_payment",
    toPaymentStatus: "awaiting_payment",
    createdAt: "2026-07-28T20:00:00Z",
    ...overrides,
  };
}

describe("customer order tracking copy", () => {
  it("prioritizes refund and rejection information", () => {
    expect(
      customerOrderPresentation({
        status: "refund_pending",
        paymentStatus: "refund_pending",
      }).label,
    ).toBe("Reembolso pendiente");
    expect(
      customerOrderPresentation({
        status: "cancelled",
        paymentStatus: "rejected",
      }).label,
    ).toBe("Pago rechazado");
  });

  it("describes the purchasing and delivery journey", () => {
    expect(
      customerOrderPresentation({
        status: "purchased",
        paymentStatus: "paid",
      }).label,
    ).toBe("Comprado en Corea");
    expect(
      customerOrderPresentation({
        status: "ready_for_delivery",
        paymentStatus: "paid",
      }).help,
    ).toContain("WhatsApp");
  });

  it("creates understandable timeline labels", () => {
    expect(customerTimelineLabel(history({ fromStatus: null }))).toBe("Pedido creado");
    expect(
      customerTimelineLabel(
        history({
          toPaymentStatus: "payment_reported",
        }),
      ),
    ).toBe("Aviso de pago recibido");
    expect(
      customerTimelineLabel(
        history({
          fromPaymentStatus: "payment_reported",
          toPaymentStatus: "paid",
          toStatus: "confirmed",
        }),
      ),
    ).toBe("Pago confirmado");
  });

  it("keeps separate Spanish labels for order and payment states", () => {
    expect(customerOrderStatusLabels.in_transit).toBe("En camino a Bolivia");
    expect(customerPaymentStatusLabels.payment_reported).toBe("Pago avisado");
  });
});
