"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCustomerAuthMessage } from "@/lib/auth/messages";
import { isValidFullName, normalizeBolivianPhoneInput } from "@/lib/auth/validation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ProfileForm() {
  const router = useRouter();
  const { configured, isAnonymous, loading, profile, refreshProfile, signOut, user } =
    useAuth();
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && (!user || isAnonymous)) {
      router.replace("/ingresar?next=/mi-cuenta");
    }
  }, [isAnonymous, loading, router, user]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const rawPhone = String(form.get("phone") ?? "").trim();
    const phone = rawPhone ? normalizeBolivianPhoneInput(rawPhone) : null;

    if (!isValidFullName(fullName)) {
      setMessage("Escribe un nombre de 2 a 120 caracteres.");
      return;
    }
    if (rawPhone && !phone) {
      setMessage("Escribe un número móvil boliviano válido de 8 dígitos.");
      return;
    }

    setBusy(true);
    setMessage("");
    setSaved(false);
    const { error } = await supabase.rpc("upsert_own_profile", {
      p_full_name: fullName,
      p_phone: phone,
    });

    if (error) {
      setMessage(getCustomerAuthMessage(error, "profile"));
    } else {
      await refreshProfile();
      setSaved(true);
    }
    setBusy(false);
  }

  async function logout() {
    setBusy(true);
    await signOut();
    router.replace("/");
  }

  if (loading || !user || isAnonymous) {
    return (
      <p className="text-muted" role="status">
        Cargando tu cuenta…
      </p>
    );
  }

  return (
    <>
      {!configured ? (
        <Alert title="Configuración local pendiente">
          Agrega las variables públicas de Supabase para usar la cuenta.
        </Alert>
      ) : null}
      {message ? (
        <Alert className="mt-4" title="No pudimos guardar tus datos" role="alert">
          {message}
        </Alert>
      ) : null}
      {saved ? (
        <p className="mt-4 rounded-xl bg-success-soft p-4 font-semibold text-success">
          Tus datos se guardaron correctamente.
        </p>
      ) : null}
      <form
        key={`${profile?.id}-${profile?.fullName}-${profile?.phoneE164}`}
        className="mt-5 grid gap-4"
        onSubmit={saveProfile}
      >
        <Input
          label="Nombre completo"
          name="fullName"
          autoComplete="name"
          defaultValue={profile?.fullName ?? ""}
          required
        />
        <Input
          label="Número de teléfono"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={profile?.phoneE164 ?? ""}
          hint="Puedes actualizarlo; esto no vincula pedidos antiguos de invitado."
        />
        <Input
          label="Correo electrónico"
          value={user.email ?? ""}
          type="email"
          disabled
          readOnly
        />
        <Button type="submit" disabled={busy || !configured}>
          {busy ? "Guardando…" : "Guardar datos"}
        </Button>
      </form>
      <ButtonLink className="mt-2 w-full" href="/mis-pedidos" variant="secondary">
        Ver mis pedidos
      </ButtonLink>
      <Button className="mt-2 w-full" variant="ghost" onClick={logout} disabled={busy}>
        Cerrar sesión
      </Button>
    </>
  );
}
