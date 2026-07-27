"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { PaymentEvidence } from "@/components/admin/payment-evidence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MockNotice } from "@/components/ui/mock-notice";
import { findMockOrder, orderStatusCopy } from "@/lib/mock-data/orders";
import { formatBob } from "@/lib/money/format";

export function AdminOrderDetail() {
  const params = useSearchParams();
  const order = findMockOrder(params.get("id"));
  const initial = orderStatusCopy[order.status];
  const [status, setStatus] = useState(initial.label);
  const [notice, setNotice] = useState("");
  const update = (next: string) => {
    setStatus(next);
    setNotice(`Estado simulado actualizado a “${next}”. No se guardó ningún cambio.`);
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant={status === "Pagado" ? "success" : "warning"}>{status}</Badge>
          <h1 className="mt-3 text-3xl font-black">{order.number}</h1>
          <p className="mt-1 text-muted">
            Creado {order.createdAt} · Vence {order.expiresAt}
          </p>
        </div>
        <strong className="text-2xl">{formatBob(order.totalBob)}</strong>
      </div>
      <MockNotice className="mt-5" />
      {notice && (
        <p
          className="mt-4 rounded-xl bg-success-soft p-4 text-sm font-bold text-success"
          role="status"
        >
          {notice}
        </p>
      )}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-lg font-bold">Cliente</h2>
            <p className="mt-3 font-semibold">{order.customerName}</p>
            <p className="text-muted">{order.phone}</p>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-bold">Productos</h2>
            <div className="mt-4 divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.name} className="flex justify-between gap-4 py-3 text-sm">
                  <div>
                    <strong>{item.name}</strong>
                    <p className="text-muted">
                      {item.quantity} unidades × {formatBob(item.unitPriceBob)}
                    </p>
                  </div>
                  <strong>{formatBob(item.quantity * item.unitPriceBob)}</strong>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Evidencia privada</h2>
            <PaymentEvidence />
          </Card>
        </div>
        <Card className="h-fit p-5">
          <h2 className="text-lg font-bold">Acciones del pedido</h2>
          <div className="mt-4 grid gap-3">
            <Button onClick={() => update("Pagado")}>Marcar como pagado</Button>
            <Button variant="secondary" onClick={() => update("Pago rechazado")}>
              Rechazar pago
            </Button>
            <Button variant="secondary" onClick={() => update("Cancelado")}>
              Cancelar pedido
            </Button>
            <Button variant="secondary" onClick={() => update("Reembolso pendiente")}>
              Registrar reembolso pendiente
            </Button>
          </div>
          {order.status === "expired" && (
            <div className="mt-5 rounded-xl bg-warning-soft p-4">
              <p className="text-sm font-bold text-warning">
                Pedido vencido con pago tardío
              </p>
              <p className="mt-1 text-xs leading-5 text-warning">
                La regla normal es cancelar y devolver. La aceptación excepcional requiere
                revalidar inventario y registrar un motivo.
              </p>
              <Button
                className="mt-3 w-full"
                variant="secondary"
                onClick={() => update("Pagado · excepción")}
              >
                Aceptar excepcionalmente
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
