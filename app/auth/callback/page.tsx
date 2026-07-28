import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCallback } from "@/components/auth/auth-callback";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Verificando cuenta" };

export default function AuthCallbackPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <Card className="mx-auto max-w-md p-6 sm:p-8">
          <Suspense fallback={<p className="text-center text-muted">Verificando…</p>}>
            <AuthCallback />
          </Suspense>
        </Card>
      </main>
    </CustomerShell>
  );
}
