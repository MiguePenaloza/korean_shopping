"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { getSafeNextPath } from "@/lib/auth/validation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);
  const code = searchParams.get("code");
  const supabase = getSupabaseBrowserClient();
  const invalidRequest = !code || !supabase;

  useEffect(() => {
    const nextPath = getSafeNextPath(searchParams.get("next"));

    if (!code || !supabase) {
      return;
    }

    let active = true;
    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!active) return;
      if (error) {
        setFailed(true);
      } else {
        router.replace(nextPath);
      }
    });

    return () => {
      active = false;
    };
  }, [code, router, searchParams, supabase]);

  if (invalidRequest || failed) {
    return (
      <Alert title="El enlace no pudo verificarse" role="alert">
        Puede haber vencido o ya fue utilizado.
        <ButtonLink className="mt-3 w-full" href="/ingresar" variant="secondary">
          Volver a ingresar
        </ButtonLink>
      </Alert>
    );
  }

  return (
    <p className="text-center text-muted" role="status">
      Verificando tu cuenta…
    </p>
  );
}
