import type { Metadata } from "next";

import { CustomerShell } from "@/components/layout/customer-shell";
import { OrderActions } from "@/components/orders/order-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Pedido confirmado" };

export default function ConfirmedOrderPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <div className="mx-auto max-w-2xl">
          <Badge variant="warning">Esperando pago</Badge>
          <h1 className="mt-4 text-3xl font-black">Pedido BP-2607-123</h1>
          <p className="mt-2 text-muted">Reserva simulada válida hasta las 20:07.</p>
          <Card className="mt-6 p-5 sm:p-6">
            <h2 className="text-xl font-bold">Siguiente paso</h2>
            <ol className="mt-4 space-y-4">
              {[
                "Solicita el QR por WhatsApp.",
                "Paga el total de Bs 406.",
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
              <OrderActions />
            </div>
          </Card>
        </div>
      </main>
    </CustomerShell>
  );
}
