import type { Metadata } from "next";

import { ProfileForm } from "@/components/auth/profile-form";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Mi cuenta" };

export default function AccountPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <Card className="mx-auto max-w-lg p-6 sm:p-8">
          <p className="text-sm font-bold text-accent">Cuenta Belle Perle</p>
          <h1 className="mt-1 text-3xl font-black">Mis datos</h1>
          <p className="mt-3 leading-6 text-muted">
            Estos datos se usan en los pedidos que hagas mientras tengas la sesión
            iniciada.
          </p>
          <ProfileForm />
        </Card>
      </main>
    </CustomerShell>
  );
}
