"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { OrderActions } from "@/components/orders/order-actions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBob } from "@/lib/money/format";
import {
  getOrderConfirmation,
  type OrderConfirmation as OrderConfirmationData,
} from "@/lib/orders/orders";

function expirationLabel(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function OrderConfirmation() {
  const params = useSearchParams();
  const orderId = params.get("id") ?? "";
  const { configured, loading: authLoading, user } = useAuth();
  const [order, setOrder] = useState<OrderConfirmationData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );

  const load = useCallback(async () => {
    if (!configured || !user || !orderId) {
      setStatus("missing");
      return;
    }
    try {
      const current = await getOrderConfirmation(orderId);
      setOrder(current);
      setStatus(current ? "ready" : "missing");
    } catch {
      setStatus("error");
    }
  }, [configured, orderId, user]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, load]);

  if (authLoading || status === "loading") {
    return (
      <p className="text-muted" role="status">
        Cargando pedido…
      </p>
    );
  }

  if (status === "missing") {
    return (
      <EmptyState
        title="Pedido no encontrado"
        description="Abre el enlace desde el mismo navegador donde confirmaste el pedido."
        action={<ButtonLink href="/buscar">Volver al catálogo</ButtonLink>}
      />
    );
  }

  if (status === "error" || !order) {
    return (
      <EmptyState
        title="No pudimos cargar el pedido"
        description="Revisa tu conexión e inténtalo nuevamente."
        action={<ButtonLink href="/buscar">Volver al catálogo</ButtonLink>}
      />
    );
  }

  const expired = order.status === "expired";
  const paymentReported = order.paymentStatus === "payment_reported";
  const paid = order.paymentStatus === "paid";
  const badgeVariant = paid ? "success" : expired ? "neutral" : "warning";
  const badgeLabel = paid
    ? "Pago confirmado"
    : expired
      ? "Pedido vencido"
      : paymentReported
        ? "Pago avisado"
        : "Esperando pago";

  return (
    <div className="mx-auto max-w-2xl">
      <Badge variant={badgeVariant}>{badgeLabel}</Badge>
      <h1 className="mt-4 text-3xl font-black">Pedido {order.number}</h1>
      <p className="mt-2 text-muted">
        {expired
          ? "La reserva terminó. Escríbenos por WhatsApp si realizaste el pago."
          : `Reserva válida hasta ${expirationLabel(order.reservationExpiresAt)}.`}
      </p>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Resumen confirmado</h2>
        <div className="mt-4 divide-y divide-border">
          {order.items.map((item) => (
            <div
              key={item.code}
              className="flex items-start justify-between gap-4 py-3 text-sm"
            >
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="text-muted">
                  {item.quantity} × {formatBob(item.unitPriceBob)}
                  {item.variant ? ` · ${item.variant}` : ""}
                </p>
              </div>
              <strong>{formatBob(item.lineTotalBob)}</strong>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-border pt-4 text-xl font-black">
          <span>Total</span>
          <span>{formatBob(order.totalBob)}</span>
        </div>
      </Card>

      <Card className="mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Siguiente paso</h2>
        <ol className="mt-4 space-y-4">
          {[
            "Solicita el QR por WhatsApp.",
            `Paga el total de ${formatBob(order.totalBob)}.`,
            "Avisa que realizaste el pago para que podamos verificarlo.",
          ].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-white">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 border-t border-border pt-5">
          <OrderActions
            orderId={order.id}
            orderNumber={order.number}
            totalBob={order.totalBob}
            customerName={order.customerName}
            whatsappPhoneE164={order.whatsappPhoneE164}
            expired={expired || paid}
            paymentReported={paymentReported}
            onPaymentReported={load}
          />
        </div>
      </Card>
    </div>
  );
}
