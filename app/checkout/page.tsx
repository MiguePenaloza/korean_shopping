import type { Metadata } from "next";

import { CheckoutPrototype } from "@/components/checkout/checkout-prototype";
import { CustomerShell } from "@/components/layout/customer-shell";

export const metadata: Metadata = { title: "Confirmar pedido" };

export default function CheckoutPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <p className="text-sm font-bold text-accent">Paso 2 de 2</p>
        <h1 className="mt-1 text-3xl font-black">Confirma como invitado</h1>
        <CheckoutPrototype />
      </main>
    </CustomerShell>
  );
}
