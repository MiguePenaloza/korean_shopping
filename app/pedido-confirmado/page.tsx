import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomerShell } from "@/components/layout/customer-shell";
import { OrderConfirmation } from "@/components/orders/order-confirmation";

export const metadata: Metadata = { title: "Pedido confirmado" };

export default function ConfirmedOrderPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <Suspense
          fallback={
            <p className="text-muted" role="status">
              Cargando pedido…
            </p>
          }
        >
          <OrderConfirmation />
        </Suspense>
      </main>
    </CustomerShell>
  );
}
