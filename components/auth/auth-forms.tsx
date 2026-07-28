"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCustomerAuthMessage } from "@/lib/auth/messages";
import {
  getSafeNextPath,
  isValidFullName,
  isValidPassword,
  normalizeBolivianPhoneInput,
} from "@/lib/auth/validation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

async function clearAnonymousSession() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.is_anonymous) {
    await supabase.auth.signOut({ scope: "local" });
  }
}

function ConfigurationAlert() {
  return (
    <Alert title="Configuración local pendiente">
      Agrega la URL y la clave pública de Supabase en <code>.env.local</code> para probar
      el acceso. No se necesita una clave de servicio en el navegador.
    </Alert>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { configured } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const nextPath = getSafeNextPath(searchParams.get("next"));

  async function loginWithGoogle() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setMessage("");

    try {
      await clearAnonymousSession();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", nextPath);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(getCustomerAuthMessage(error, "login"));
      setBusy(false);
    }
  }

  async function loginWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");

    try {
      await clearAnonymousSession();
      const { error } = await supabase.auth.signInWithPassword({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      });
      if (error) throw error;
      router.replace(nextPath);
    } catch (error) {
      setMessage(getCustomerAuthMessage(error, "login"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!configured ? <ConfigurationAlert /> : null}
      {message ? (
        <Alert className="mt-4" title="No pudimos ingresar" role="alert">
          {message}
        </Alert>
      ) : null}
      <Button
        className="mt-6 w-full"
        variant="secondary"
        onClick={loginWithGoogle}
        disabled={!configured || busy}
      >
        Continuar con Google
      </Button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        o usa tu correo
        <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={loginWithEmail}>
        <div className="grid gap-4">
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button className="mt-5 w-full" type="submit" disabled={!configured || busy}>
          {busy ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
      <ButtonLink className="mt-2 w-full" href="/recuperar-contrasena" variant="ghost">
        Olvidé mi contraseña
      </ButtonLink>
      <p className="mt-5 text-center text-sm text-muted">
        ¿Aún no tienes cuenta?{" "}
        <a className="font-bold text-accent underline" href="/registro">
          Crear cuenta
        </a>
      </p>
    </>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { configured } = useAuth();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const phone = normalizeBolivianPhoneInput(String(form.get("phone") ?? ""));
    const password = String(form.get("password") ?? "");

    if (!isValidFullName(fullName)) {
      setMessage("Escribe un nombre de 2 a 120 caracteres.");
      return;
    }
    if (!phone) {
      setMessage("Escribe un número móvil boliviano válido de 8 dígitos.");
      return;
    }
    if (!isValidPassword(password)) {
      setMessage("Usa una contraseña de al menos 8 caracteres.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await clearAnonymousSession();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", "/mi-cuenta");

      const { data, error } = await supabase.auth.signUp({
        email: String(form.get("email") ?? "").trim(),
        password,
        options: {
          emailRedirectTo: redirectTo.toString(),
          data: { full_name: fullName, phone },
        },
      });
      if (error) throw error;

      if (data.session) {
        router.replace("/mi-cuenta");
      } else {
        setSuccess(true);
      }
    } catch (error) {
      setMessage(getCustomerAuthMessage(error, "signup"));
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <Alert title="Revisa tu correo" role="status">
        Te enviamos un enlace para confirmar la cuenta. Después podrás ingresar y ver tus
        pedidos hechos con esa cuenta.
      </Alert>
    );
  }

  return (
    <>
      {!configured ? <ConfigurationAlert /> : null}
      {message ? (
        <Alert className="mt-4" title="Revisa los datos" role="alert">
          {message}
        </Alert>
      ) : null}
      <form className="mt-5 grid gap-4" onSubmit={register}>
        <Input label="Nombre completo" name="fullName" autoComplete="name" required />
        <Input
          label="Número de teléfono"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Ej.: 71234567"
          required
        />
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Input
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres."
          minLength={8}
          required
        />
        <Button type="submit" disabled={!configured || busy}>
          {busy ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
    </>
  );
}

export function RecoveryForm() {
  const { configured } = useAuth();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const form = new FormData(event.currentTarget);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", "/restablecer-contrasena");
    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(
      String(form.get("email") ?? "").trim(),
      { redirectTo: redirectTo.toString() },
    );

    if (error) {
      setMessage(getCustomerAuthMessage(error, "recovery"));
    } else {
      setSent(true);
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <Alert title="Revisa tu correo" role="status">
        Si existe una cuenta con ese correo, recibirás un enlace para crear una contraseña
        nueva.
      </Alert>
    );
  }

  return (
    <>
      {!configured ? <ConfigurationAlert /> : null}
      {message ? (
        <Alert className="mt-4" title="No pudimos enviar el enlace" role="alert">
          {message}
        </Alert>
      ) : null}
      <form className="mt-5 grid gap-4" onSubmit={recover}>
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Button type="submit" disabled={!configured || busy}>
          {busy ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
    </>
  );
}

export function NewPasswordForm() {
  const router = useRouter();
  const { configured } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (!isValidPassword(password)) {
      setMessage("Usa una contraseña de al menos 8 caracteres.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(getCustomerAuthMessage(error, "password"));
    } else {
      router.replace("/mi-cuenta");
    }
    setBusy(false);
  }

  return (
    <>
      {!configured ? <ConfigurationAlert /> : null}
      {message ? (
        <Alert className="mt-4" title="No pudimos guardar la contraseña" role="alert">
          {message}
        </Alert>
      ) : null}
      <form className="mt-5 grid gap-4" onSubmit={updatePassword}>
        <Input
          label="Contraseña nueva"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Button type="submit" disabled={!configured || busy}>
          {busy ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </>
  );
}
