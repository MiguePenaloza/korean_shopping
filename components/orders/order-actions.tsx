"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { reportOrderPayment } from "@/lib/orders/orders";
import {
  paymentReportedMessage,
  requestQrMessage,
  whatsappUrl,
} from "@/lib/orders/whatsapp";

type OrderActionsProps = {
  orderId: string;
  orderNumber: string;
  totalBob: number;
  customerName: string;
  whatsappPhoneE164: string;
  expired: boolean;
  paymentReported: boolean;
  onPaymentReported: () => Promise<void>;
};

export function OrderActions({
  customerName,
  expired,
  onPaymentReported,
  orderId,
  orderNumber,
  paymentReported,
  totalBob,
  whatsappPhoneE164,
}: OrderActionsProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function requestQr() {
    setMessage("");
    try {
      window.location.assign(
        whatsappUrl(
          whatsappPhoneE164,
          requestQrMessage({
            number: orderNumber,
            totalBob,
            customerName,
          }),
        ),
      );
    } catch {
      setMessage("No pudimos abrir WhatsApp en este dispositivo.");
    }
  }

  async function reportPayment() {
    setBusy(true);
    setMessage("");
    try {
      await reportOrderPayment(orderId);
      await onPaymentReported();
      window.location.assign(
        whatsappUrl(
          whatsappPhoneE164,
          paymentReportedMessage({ number: orderNumber, totalBob }),
        ),
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "PAYMENT_REPORT_WINDOW_CLOSED"
          ? "El tiempo para avisar el pago terminó. Escríbenos por WhatsApp para coordinar."
          : "No pudimos registrar el aviso de pago. Revisa tu conexión e inténtalo otra vez.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button disabled={expired} onClick={requestQr}>
          Solicitar QR por WhatsApp
        </Button>
        <Button
          variant="secondary"
          disabled={busy || expired}
          onClick={() => void reportPayment()}
        >
          {busy
            ? "Registrando aviso…"
            : paymentReported
              ? "Abrir WhatsApp nuevamente"
              : "Avisar pago realizado"}
        </Button>
      </div>
      {message ? (
        <p
          className="mt-4 rounded-xl bg-warning-soft p-4 text-sm leading-6 text-warning"
          role="alert"
        >
          {message}
        </p>
      ) : null}
      <p className="mt-4 text-sm leading-6 text-muted">
        Avisar el pago extiende la reserva hasta el minuto 25, pero no marca el pedido
        como pagado. La confirmación final la realiza la administración después de
        verificar el QR.
      </p>
    </div>
  );
}
