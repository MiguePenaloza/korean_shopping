"use client";

import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { findMockOrder, orderStatusCopy } from "@/lib/mock-data/orders";
import { formatBob } from "@/lib/money/format";

export function CustomerOrderDetail() {
  const params = useSearchParams();
  const order = findMockOrder(params.get("id"));
  const status = orderStatusCopy[order.status];
  return (
    <div className="mx-auto max-w-2xl">
      <Badge variant={status.variant}>{status.label}</Badge>
      <h1 className="mt-4 text-3xl font-black">{order.number}</h1>
      <p className="mt-2 leading-6 text-muted">{status.description}</p>
      <Card className="mt-6 p-5">
        <h2 className="text-lg font-bold">Productos</h2>
        <div className="mt-4 space-y-3">
          {order.items.map((item) => (
            <div key={item.name} className="flex justify-between gap-4 text-sm">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span>{formatBob(item.quantity * item.unitPriceBob)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-border pt-4 text-lg font-black">
          <span>Total</span>
          <span>{formatBob(order.totalBob)}</span>
        </div>
      </Card>
      <Card className="mt-4 p-5">
        <h2 className="text-lg font-bold">Línea de tiempo</h2>
        <ol className="mt-4 space-y-4 border-l-2 border-border pl-5">
          <li>
            <strong>Pedido creado</strong>
            <p className="text-sm text-muted">{order.createdAt}</p>
          </li>
          <li>
            <strong>Aviso de pago recibido</strong>
            <p className="text-sm text-muted">
              Pendiente de verificación administrativa.
            </p>
          </li>
        </ol>
      </Card>
      <Card className="mt-4 p-5 text-sm leading-6 text-muted">
        Las acciones de pago se muestran únicamente en la confirmación real del pedido. El
        historial completo se conectará en la Fase 9.
      </Card>
    </div>
  );
}
