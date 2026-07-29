"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  listAdminOrders,
  orderStatusLabels,
  paymentStatusLabels,
  type AdminOrderFilter,
  type AdminOrderSummary,
} from "@/lib/admin/orders";
import { formatBob } from "@/lib/money/format";

const filters: { value: AdminOrderFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "payment_reported", label: "Pago avisado" },
  { value: "paid", label: "Pagados" },
  { value: "expired", label: "Vencidos" },
  { value: "refund_pending", label: "Por reembolsar" },
  { value: "refunded", label: "Reembolsados" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusVariant(order: AdminOrderSummary) {
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") {
    return "success" as const;
  }
  if (
    order.status === "expired" ||
    order.paymentStatus === "payment_reported" ||
    order.paymentStatus === "refund_pending"
  ) {
    return "warning" as const;
  }
  return "neutral" as const;
}

export function AdminOrderList() {
  const [filter, setFilter] = useState<AdminOrderFilter>("all");
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async (nextFilter: AdminOrderFilter) => {
    setStatus("loading");
    try {
      setOrders(await listAdminOrders(nextFilter));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void listAdminOrders(filter)
      .then((rows) => {
        if (!active) return;
        setOrders(rows);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [filter]);

  function selectFilter(nextFilter: AdminOrderFilter) {
    setFilter(nextFilter);
  }

  return (
    <>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filtros">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold ${
              filter === item.value
                ? "bg-foreground text-white"
                : "border border-border bg-surface"
            }`}
            onClick={() => selectFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {status === "loading" ? (
        <p className="mt-6 text-muted" role="status">
          Cargando pedidos…
        </p>
      ) : null}

      {status === "error" ? (
        <div className="mt-6">
          <EmptyState
            title="No pudimos cargar los pedidos"
            description="Revisa la conexión y vuelve a intentarlo."
            action={<Button onClick={() => void load(filter)}>Reintentar</Button>}
          />
        </div>
      ) : null}

      {status === "ready" && orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No hay pedidos en este estado"
            description="Cuando exista actividad, aparecerá aquí."
          />
        </div>
      ) : null}

      {status === "ready" && orders.length > 0 ? (
        <div className="mt-5 space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/pedidos/detalle?id=${order.id}`}
              className="block"
            >
              <Card className="grid gap-4 p-5 transition-transform hover:-translate-y-0.5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{order.number}</h2>
                    <Badge variant={statusVariant(order)}>
                      {paymentStatusLabels[order.paymentStatus]}
                    </Badge>
                    <Badge variant="neutral">{orderStatusLabels[order.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {order.customerName} · {order.phoneE164}
                  </p>
                  <p className="mt-2 text-sm">
                    {order.itemQuantity} unidades · Creado {formatDate(order.createdAt)}
                  </p>
                  {order.evidenceCount > 0 ? (
                    <p className="mt-1 text-xs font-bold text-success">
                      {order.evidenceCount} comprobante
                      {order.evidenceCount === 1 ? "" : "s"} privado
                      {order.evidenceCount === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
                <div className="sm:text-right">
                  <strong className="text-xl">{formatBob(order.totalBob)}</strong>
                  <p className="text-sm text-muted">
                    Límite: {formatDate(order.reservationExpiresAt)}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      {status === "ready" && orders.length === 50 ? (
        <p className="mt-4 text-center text-sm text-muted">
          Se muestran los 50 pedidos más recientes.
        </p>
      ) : null}
    </>
  );
}
