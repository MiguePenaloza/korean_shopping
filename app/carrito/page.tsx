import type { Metadata } from "next";

import { CartPrototype } from "@/components/checkout/cart-prototype";
import { CustomerShell } from "@/components/layout/customer-shell";

export const metadata: Metadata = { title: "Carrito" };

export default function CartPage() {
  return (
    <CustomerShell active="/carrito">
      <main className="page-container">
        <p className="text-sm font-bold text-accent">Paso 1 de 2</p>
        <h1 className="mt-1 text-3xl font-black">Tu carrito</h1>
        <CartPrototype />
      </main>
    </CustomerShell>
  );
}
