"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listAdminOrders } from "@/lib/admin/orders";
import { listAdminProducts } from "@/lib/admin/products";

type DashboardMetrics = {
  reviewOrders: number;
  confirmedUnits: number;
  remainingUnits: number;
  expiredPrices: number;
};

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([listAdminOrders("all"), listAdminProducts()])
      .then(([orders, products]) => {
        if (!active) return;
        const now = Date.now();
        setMetrics({
          reviewOrders: orders.filter(
            (order) =>
              order.paymentStatus === "payment_reported" ||
              order.paymentStatus === "refund_pending",
          ).length,
          confirmedUnits: products.reduce(
            (sum, product) => sum + product.confirmedStock,
            0,
          ),
          remainingUnits: products.reduce(
            (sum, product) => sum + product.remainingStock,
            0,
          ),
          expiredPrices: products.filter(
            (product) =>
              product.status === "active" &&
              (!product.priceExpiresAt ||
                new Date(product.priceExpiresAt).getTime() <= now),
          ).length,
        });
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const values = [
    ["Pedidos por revisar", metrics?.reviewOrders],
    ["Unidades confirmadas", metrics?.confirmedUnits],
    ["Unidades restantes", metrics?.remainingUnits],
    ["Precios vencidos", metrics?.expiredPrices],
  ] as const;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-accent">Horario de Bolivia</p>
          <h1 className="mt-1 text-3xl font-black">Resumen del viaje</h1>
        </div>
        <Badge variant={error ? "warning" : metrics ? "success" : "neutral"}>
          {error ? "Sin conexión" : metrics ? "Datos actualizados" : "Actualizando…"}
        </Badge>
      </div>

      {error ? (
        <p
          className="mt-5 rounded-xl bg-warning-soft p-4 text-sm text-warning"
          role="alert"
        >
          No pudimos actualizar el resumen. Abre Productos o Pedidos para volver a
          intentarlo.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {values.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-black">{value ?? "—"}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Link href="/admin/productos/nuevo">
          <Card className="p-6 hover:border-accent">
            <p className="text-sm font-bold text-accent">Acción rápida</p>
            <h2 className="mt-2 text-2xl font-bold">Crear producto</h2>
            <p className="mt-2 text-muted">
              Fotografía, precio KRW, cantidad y ganancia.
            </p>
          </Card>
        </Link>
        <Link href="/admin/pedidos">
          <Card className="p-6 hover:border-accent">
            <p className="text-sm font-bold text-accent">Operación</p>
            <h2 className="mt-2 text-2xl font-bold">Revisar pagos</h2>
            <p className="mt-2 text-muted">
              Confirma pagos, adjunta comprobantes y gestiona reembolsos.
            </p>
          </Card>
        </Link>
      </div>
    </>
  );
}
