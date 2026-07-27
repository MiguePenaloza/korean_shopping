import type { Metadata } from "next";

import { CustomerShell } from "@/components/layout/customer-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MockNotice } from "@/components/ui/mock-notice";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <Card className="mx-auto max-w-md p-6 sm:p-8">
          <p className="text-sm font-bold text-accent">Cuenta opcional</p>
          <h1 className="mt-1 text-3xl font-black">Ingresa a Belle Perle</h1>
          <p className="mt-3 leading-6 text-muted">
            Tu cuenta sirve para consultar el historial. También puedes comprar como
            invitado sin correo.
          </p>
          <Button className="mt-6 w-full" variant="secondary">
            Continuar con Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            o usa tu correo
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-4">
            <Input label="Correo electrónico" type="email" autoComplete="email" />
            <Input label="Contraseña" type="password" autoComplete="current-password" />
          </div>
          <Button className="mt-5 w-full">Ingresar</Button>
          <ButtonLink className="mt-2 w-full" href="/mis-pedidos" variant="ghost">
            Ver cuenta simulada
          </ButtonLink>
          <p className="mt-4 text-center text-sm text-muted">
            La recuperación por correo estará disponible cuando se configure Supabase.
          </p>
          <MockNotice className="mt-5" />
        </Card>
      </main>
    </CustomerShell>
  );
}
