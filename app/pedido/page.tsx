import type { Metadata } from "next";

import { CustomerShell } from "@/components/layout/customer-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Cómo comprar" };

export default function OrderHelpPage() {
  const steps = [
    ["Elige", "Agrega productos con precio vigente al carrito."],
    ["Confirma", "Escribe únicamente tu nombre y número de teléfono."],
    ["Paga", "Solicita el QR y avisa el pago por WhatsApp."],
    ["Sigue", "Con una cuenta opcional podrás ver el historial y los estados."],
  ];
  return (
    <CustomerShell active="/pedido">
      <main className="page-container">
        <p className="text-sm font-bold text-accent">Compra sencilla</p>
        <h1 className="mt-1 text-3xl font-black">¿Cómo funciona?</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {steps.map(([title, description], index) => (
            <Card key={title} className="p-5">
              <span className="text-sm font-black text-accent">0{index + 1}</span>
              <h2 className="mt-2 text-xl font-bold">{title}</h2>
              <p className="mt-2 leading-6 text-muted">{description}</p>
            </Card>
          ))}
        </div>
        <ButtonLink href="/buscar" className="mt-6">
          Ver productos
        </ButtonLink>
      </main>
    </CustomerShell>
  );
}
