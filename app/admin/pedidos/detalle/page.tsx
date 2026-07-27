import { Suspense } from "react";

import { AdminOrderDetail } from "@/components/admin/admin-order-detail";

export default function AdminOrderDetailPage() {
  return (
    <main className="page-container">
      <Suspense fallback={<p>Cargando pedido…</p>}>
        <AdminOrderDetail />
      </Suspense>
    </main>
  );
}
