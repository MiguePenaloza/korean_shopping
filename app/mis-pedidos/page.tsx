import type { Metadata } from "next";

import { CustomerShell } from "@/components/layout/customer-shell";
import { CustomerOrderList } from "@/components/orders/customer-order-list";

export const metadata: Metadata = { title: "Mis pedidos" };

export default function OrdersPage() {
  return (
    <CustomerShell active="/mis-pedidos">
      <CustomerOrderList />
    </CustomerShell>
  );
}
