import type { Metadata } from "next";

import { AdminOrderList } from "@/components/admin/admin-order-list";

export const metadata: Metadata = { title: "Pedidos" };

export default function AdminOrdersPage() {
  return (
    <main className="page-container">
      <p className="text-sm font-bold text-accent">Operación</p>
      <h1 className="mt-1 text-3xl font-black">Pedidos</h1>
      <p className="mt-2 max-w-2xl leading-6 text-muted">
        Verifica avisos de pago, confirma pedidos y registra reembolsos con historial
        auditable.
      </p>
      <AdminOrderList />
    </main>
  );
}
