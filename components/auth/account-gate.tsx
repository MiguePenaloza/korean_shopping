"use client";

import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AccountGate({ children }: { children: React.ReactNode }) {
  const { configured, isAnonymous, loading, user } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="page-container" role="status">
        <p className="text-muted">Revisando tu cuenta…</p>
      </div>
    );
  }

  if (!configured || !user || isAnonymous) {
    const next = encodeURIComponent(pathname);
    return (
      <main className="page-container">
        <Card className="mx-auto max-w-lg p-6 text-center sm:p-8">
          <h1 className="text-3xl font-black">Ingresa para ver tus pedidos</h1>
          <p className="mt-3 leading-7 text-muted">
            El historial está disponible solamente para cuentas con Google o correo. Los
            pedidos hechos como invitado se coordinan por WhatsApp.
          </p>
          <ButtonLink className="mt-6 w-full" href={`/ingresar?next=${next}`}>
            Ingresar
          </ButtonLink>
          <ButtonLink className="mt-2 w-full" href="/registro" variant="secondary">
            Crear cuenta
          </ButtonLink>
        </Card>
      </main>
    );
  }

  return children;
}
