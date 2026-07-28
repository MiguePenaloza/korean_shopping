import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/auth-forms";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <Card className="mx-auto max-w-md p-6 sm:p-8">
          <p className="text-sm font-bold text-accent">Cuenta opcional</p>
          <h1 className="mt-1 text-3xl font-black">Ingresa a Belle Perle</h1>
          <p className="mt-3 leading-6 text-muted">
            Tu cuenta sirve para consultar tu historial. También puedes comprar como
            invitado sin correo.
          </p>
          <Suspense fallback={<p className="mt-6 text-muted">Cargando acceso…</p>}>
            <LoginForm />
          </Suspense>
        </Card>
      </main>
    </CustomerShell>
  );
}
