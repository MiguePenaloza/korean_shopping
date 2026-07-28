import { describe, expect, it } from "vitest";

import {
  paymentReportedMessage,
  requestQrMessage,
  whatsappUrl,
} from "@/lib/orders/whatsapp";

describe("WhatsApp order actions", () => {
  it("builds the approved QR request message", () => {
    expect(
      requestQrMessage({
        number: "BP-2607-001234",
        totalBob: 406,
        customerName: "María Fernández",
      }),
    ).toBe(
      "Hola, quiero solicitar el QR para pagar y confirmar mi pedido BP-2607-001234.\nTotal: Bs 406,00.\nNombre: María Fernández.",
    );
  });

  it("builds the approved payment-reported message and wa.me URL", () => {
    const message = paymentReportedMessage({
      number: "BP-2607-001234",
      totalBob: 406,
    });
    const url = whatsappUrl("+59177912632", message);
    expect(url).toContain("https://wa.me/59177912632?text=");
    expect(decodeURIComponent(url.split("?text=")[1] ?? "")).toBe(message);
  });
});
