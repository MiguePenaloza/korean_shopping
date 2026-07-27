import type { Metadata } from "next";
import Link from "next/link";

import { CustomerShell } from "@/components/layout/customer-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MockNotice } from "@/components/ui/mock-notice";
import { mockOrders, orderStatusCopy } from "@/lib/mock-data/orders";
import { formatBob } from "@/lib/money/format";

export const metadata: Metadata = { title: "Mis pedidos" };

export default function OrdersPage() {
  return (
    <CustomerShell active="/mis-pedidos">
      <main className="page-container">
        <p className="text-sm font-bold text-accent">Hola, María</p>
        <h1 className="mt-1 text-3xl font-black">Mis pedidos</h1>
        <p className="mt-2 text-muted">
          Este historial solo estará disponible para cuentas.
        </p>
        <MockNotice className="mt-5" />
        <div className="mt-6 space-y-4">
          {mockOrders.slice(0, 2).map((order) => {
            const status = orderStatusCopy[order.status];
            return (
              <Link
                key={order.id}
                href={`/mis-pedidos/detalle?id=${order.id}`}
                className="block"
              >
                <Card className="p-5 transition-transform hover:-translate-y-0.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted">{order.createdAt}</p>
                      <h2 className="mt-1 text-lg font-bold">{order.number}</h2>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="mt-4 flex justify-between border-t border-border pt-4">
                    <span className="text-sm text-muted">
                      {order.items.length} productos
                    </span>
                    <strong>{formatBob(order.totalBob)}</strong>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </CustomerShell>
  );
}
