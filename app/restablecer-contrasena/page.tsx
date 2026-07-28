import type { Metadata } from "next";

import { NewPasswordForm } from "@/components/auth/auth-forms";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function NewPasswordPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <Card className="mx-auto max-w-md p-6 sm:p-8">
          <h1 className="text-3xl font-black">Crea una contraseña nueva</h1>
          <p className="mt-3 leading-6 text-muted">
            Elige una contraseña de al menos 8 caracteres que puedas recordar.
          </p>
          <NewPasswordForm />
        </Card>
      </main>
    </CustomerShell>
  );
}
