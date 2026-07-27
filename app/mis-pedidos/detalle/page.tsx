import { Suspense } from "react";
import type { Metadata } from "next";

import { CustomerShell } from "@/components/layout/customer-shell";
import { CustomerOrderDetail } from "@/components/orders/customer-order-detail";

export const metadata: Metadata = { title: "Detalle del pedido" };

export default function CustomerOrderDetailPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <Suspense fallback={<p>Cargando pedido…</p>}>
          <CustomerOrderDetail />
        </Suspense>
      </main>
    </CustomerShell>
  );
}
