import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/auth-forms";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <Card className="mx-auto max-w-md p-6 sm:p-8">
          <p className="text-sm font-bold text-accent">Cuenta opcional</p>
          <h1 className="mt-1 text-3xl font-black">Crea tu cuenta</h1>
          <p className="mt-3 leading-6 text-muted">
            Podrás revisar solamente los pedidos que hagas después de ingresar con esta
            cuenta. Los pedidos anteriores como invitado no se vinculan por teléfono.
          </p>
          <RegisterForm />
        </Card>
      </main>
    </CustomerShell>
  );
}
