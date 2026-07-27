import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MockNotice } from "@/components/ui/mock-notice";
import { mockOrders, orderStatusCopy } from "@/lib/mock-data/orders";
import { formatBob } from "@/lib/money/format";

export default function AdminOrdersPage() {
  return (
    <main className="page-container">
      <p className="text-sm font-bold text-accent">Operación</p>
      <h1 className="mt-1 text-3xl font-black">Pedidos</h1>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {["Todos · 3", "Pago avisado · 1", "Pagados · 1", "Vencidos · 1"].map(
          (filter, index) => (
            <button
              key={filter}
              type="button"
              className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold ${index === 0 ? "bg-foreground text-white" : "border border-border bg-surface"}`}
            >
              {filter}
            </button>
          ),
        )}
      </div>
      <MockNotice className="mt-5" />
      <div className="mt-5 space-y-4">
        {mockOrders.map((order) => {
          const status = orderStatusCopy[order.status];
          return (
            <Link
              key={order.id}
              href={`/admin/pedidos/detalle?id=${order.id}`}
              className="block"
            >
              <Card className="grid gap-4 p-5 transition-transform hover:-translate-y-0.5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{order.number}</h2>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {order.customerName} · {order.phone}
                  </p>
                  <p className="mt-2 text-sm">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} unidades ·
                    Creado {order.createdAt}
                  </p>
                </div>
                <div className="sm:text-right">
                  <strong className="text-xl">{formatBob(order.totalBob)}</strong>
                  <p className="text-sm text-muted">Vence: {order.expiresAt}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
