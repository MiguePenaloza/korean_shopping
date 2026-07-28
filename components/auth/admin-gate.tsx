"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { configured, isAdmin, loading, user } = useAuth();

  if (loading) {
    return (
      <main className="page-container" role="status">
        <p className="text-muted">Verificando acceso administrativo…</p>
      </main>
    );
  }

  if (!configured || !user || !isAdmin) {
    return (
      <main className="page-container">
        <Card className="mx-auto max-w-lg p-6 text-center sm:p-8">
          <h1 className="text-3xl font-black">Acceso administrativo</h1>
          <p className="mt-3 leading-7 text-muted">
            Esta sección requiere una cuenta administradora autorizada. La base de datos
            verifica el permiso en cada operación.
          </p>
          <ButtonLink className="mt-6 w-full" href="/ingresar?next=/admin">
            Ingresar con otra cuenta
          </ButtonLink>
          <ButtonLink className="mt-2 w-full" href="/" variant="ghost">
            Volver al inicio
          </ButtonLink>
        </Card>
      </main>
    );
  }

  return children;
}
