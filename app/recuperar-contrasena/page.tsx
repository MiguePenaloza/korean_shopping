import type { Metadata } from "next";

import { RecoveryForm } from "@/components/auth/auth-forms";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoveryPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <Card className="mx-auto max-w-md p-6 sm:p-8">
          <h1 className="text-3xl font-black">Recupera tu contraseña</h1>
          <p className="mt-3 leading-6 text-muted">
            Escribe tu correo y te enviaremos un enlace. No necesitas contactar al
            administrador ni recordar datos técnicos.
          </p>
          <RecoveryForm />
        </Card>
      </main>
    </CustomerShell>
  );
}
