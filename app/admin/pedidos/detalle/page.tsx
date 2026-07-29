import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminOrderDetail } from "@/components/admin/admin-order-detail";

export const metadata: Metadata = { title: "Detalle del pedido" };

export default function AdminOrderDetailPage() {
  return (
    <main className="page-container">
      <Suspense fallback={<p>Cargando pedido…</p>}>
        <AdminOrderDetail />
      </Suspense>
    </main>
  );
}
