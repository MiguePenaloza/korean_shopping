"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBob } from "@/lib/money/format";
import {
  customerOrderPresentation,
  customerOrderStatusLabels,
  customerPaymentStatusLabels,
  customerTimelineLabel,
  getCustomerOrderDetail,
  type CustomerOrderDetail as CustomerOrderDetailValue,
} from "@/lib/orders/tracking";
import { whatsappUrl } from "@/lib/orders/whatsapp";

const orderNumberPattern = /^BP-[0-9]{4}-[0-9]{6}$/;

function formatDate(value: string | null) {
  if (!value) return "No registrado";
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CustomerOrderDetail() {
  const params = useSearchParams();
  const orderNumber = (params.get("numero") ?? "").toUpperCase();
  const validNumber = orderNumberPattern.test(orderNumber);
  const [order, setOrder] = useState<CustomerOrderDetailValue | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "missing" | "invalid" | "error"
  >(validNumber ? "loading" : "invalid");

  const load = useCallback(async () => {
    if (!validNumber) {
      setStatus("invalid");
      return;
    }
    setStatus("loading");
    try {
      const result = await getCustomerOrderDetail(orderNumber);
      setOrder(result);
      setStatus(result ? "ready" : "missing");
    } catch (error) {
      setStatus(
        error instanceof Error && error.message === "ORDER_NOT_ACCESSIBLE"
          ? "missing"
          : "error",
      );
    }
  }, [orderNumber, validNumber]);

  useEffect(() => {
    let active = true;
    if (!validNumber) return;
    void getCustomerOrderDetail(orderNumber)
      .then((result) => {
        if (!active) return;
        setOrder(result);
        setStatus(result ? "ready" : "missing");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus(
          error instanceof Error && error.message === "ORDER_NOT_ACCESSIBLE"
            ? "missing"
            : "error",
        );
      });
    return () => {
      active = false;
    };
  }, [orderNumber, validNumber]);

  if (status === "loading") {
    return (
      <p className="text-muted" role="status">
        Cargando pedido…
      </p>
    );
  }

  if (status === "invalid" || status === "missing") {
    return (
      <EmptyState
        title="Pedido no encontrado"
        description="Este pedido no pertenece a tu cuenta o el enlace no es válido."
        action={<ButtonLink href="/mis-pedidos">Volver a mis pedidos</ButtonLink>}
      />
    );
  }

  if (status === "error" || !order) {
    return (
      <EmptyState
        title="No pudimos cargar el pedido"
        description="Revisa tu conexión y vuelve a intentarlo."
        action={<Button onClick={() => void load()}>Reintentar</Button>}
      />
    );
  }

  const presentation = customerOrderPresentation(order);
  const helpMessage = `Hola, necesito ayuda con mi pedido ${order.number}. Estado: ${presentation.label}.`;
  const showDeadline =
    order.status === "pending_payment" &&
    ["awaiting_payment", "payment_reported"].includes(order.paymentStatus);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        className="inline-flex min-h-11 items-center text-sm font-bold text-accent"
        href="/mis-pedidos"
      >
        ← Volver a mis pedidos
      </Link>

      <div className="mt-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={presentation.variant}>{presentation.label}</Badge>
          <Badge variant="neutral">
            Pago: {customerPaymentStatusLabels[order.paymentStatus]}
          </Badge>
        </div>
        <h1 className="mt-4 text-3xl font-black">Pedido {order.number}</h1>
        <p className="mt-2 leading-7 text-muted">{presentation.description}</p>
        <p className="mt-2 text-sm text-muted">Creado {formatDate(order.createdAt)}</p>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Productos comprados</h2>
        <div className="mt-4 divide-y divide-border">
          {order.items.map((item) => (
            <div
              key={item.code}
              className="flex items-start justify-between gap-4 py-3 text-sm"
            >
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="text-muted">
                  {item.brand} · {item.code}
                  {item.variant ? ` · ${item.variant}` : ""}
                </p>
                <p className="text-muted">
                  {item.quantity} × {formatBob(item.unitPriceBob)}
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

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-bold">Estado del pedido</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Pedido</dt>
              <dd className="font-bold">{customerOrderStatusLabels[order.status]}</dd>
            </div>
            <div>
              <dt className="text-muted">Pago</dt>
              <dd className="font-bold">
                {customerPaymentStatusLabels[order.paymentStatus]}
              </dd>
            </div>
          </dl>
          {order.paidAt ? (
            <p className="mt-1 text-sm text-muted">
              Confirmado {formatDate(order.paidAt)}
            </p>
          ) : null}
          {showDeadline ? (
            <p className="mt-2 text-sm leading-6 text-muted">
              Límite actual: {formatDate(order.reservationExpiresAt)}
            </p>
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold">¿Necesitas ayuda?</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{presentation.help}</p>
          <a
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-5 font-semibold text-white hover:bg-accent-strong"
            href={whatsappUrl(order.whatsappPhoneE164, helpMessage)}
            target="_blank"
            rel="noreferrer"
          >
            Consultar por WhatsApp
          </a>
        </Card>
      </div>

      <Card className="mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Línea de tiempo</h2>
        <ol className="mt-5 space-y-5 border-l-2 border-border pl-5">
          {order.history.map((entry, index) => (
            <li key={`${entry.createdAt}-${index}`} className="relative">
              <span
                className="absolute top-1 -left-[1.72rem] h-3 w-3 rounded-full bg-accent"
                aria-hidden="true"
              />
              <strong>{customerTimelineLabel(entry)}</strong>
              <p className="mt-1 text-sm text-muted">{formatDate(entry.createdAt)}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
