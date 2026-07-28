"use client";

import { type FormEvent, useCallback, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MockNotice } from "@/components/ui/mock-notice";
import { ensureGuestSession } from "@/lib/auth/guest-session";
import { getCustomerAuthMessage } from "@/lib/auth/messages";
import { isValidFullName, normalizeBolivianPhoneInput } from "@/lib/auth/validation";
import { formatBob } from "@/lib/money/format";

export function CheckoutPrototype() {
  const { configured, isAnonymous, profile, user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const localCaptchaBypass = process.env.NODE_ENV !== "production" && !siteKey;
  const needsAnonymousSession = !user;
  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  async function confirmCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const phone = normalizeBolivianPhoneInput(String(form.get("phone") ?? ""));

    if (!isValidFullName(fullName)) {
      setMessage("Escribe un nombre completo válido.");
      return;
    }
    if (!phone) {
      setMessage("Escribe un número móvil boliviano válido de 8 dígitos.");
      return;
    }
    if (form.get("terms") !== "accepted") {
      setMessage("Debes aceptar las condiciones y la política de privacidad.");
      return;
    }
    if (!configured) {
      setMessage("La conexión segura todavía no está configurada en este entorno.");
      return;
    }
    if (needsAnonymousSession && !captchaToken && !localCaptchaBypass) {
      setMessage("Completa la verificación de seguridad antes de continuar.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      if (!user) {
        await ensureGuestSession(captchaToken || undefined);
      }
      setConfirmed(true);
    } catch (error) {
      setMessage(getCustomerAuthMessage(error, "guest"));
    } finally {
      setBusy(false);
    }
  }

  if (confirmed) {
    return (
      <Card className="mx-auto mt-8 max-w-xl p-6 text-center sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-2xl text-success">
          ✓
        </span>
        <p className="mt-5 text-sm font-bold text-accent">Pedido BP-2607-123</p>
        <h1 className="mt-2 text-3xl font-black">¡Sesión preparada!</h1>
        <p className="mt-3 leading-7 text-muted">
          Tu identidad segura está lista. La reserva y el pedido continúan simulados hasta
          la Fase 7.
        </p>
        <ButtonLink href="/pedido-confirmado" className="mt-6 w-full">
          Ver demostración de pago
        </ButtonLink>
      </Card>
    );
  }

  return (
    <form className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]" onSubmit={confirmCheckout}>
      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-bold">Tus datos</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          No necesitas correo ni contraseña. Usaremos tu nombre y teléfono para coordinar
          este pedido por WhatsApp.
        </p>
        {user && !isAnonymous ? (
          <p className="mt-4 rounded-xl bg-success-soft p-4 text-sm font-semibold text-success">
            Estás comprando con tu cuenta. Este pedido podrá aparecer en tu historial
            cuando se conecten los pedidos reales.
          </p>
        ) : null}
        {!configured ? (
          <Alert className="mt-4" title="Configuración local pendiente">
            Agrega las variables públicas de Supabase para crear la sesión de invitado.
          </Alert>
        ) : null}
        {needsAnonymousSession && !siteKey && !localCaptchaBypass ? (
          <Alert className="mt-4" title="Verificación no configurada">
            Este entorno necesita la clave pública de Turnstile antes de aceptar pedidos
            como invitado.
          </Alert>
        ) : null}
        {message ? (
          <Alert className="mt-4" title="Revisa los datos" role="alert">
            {message}
          </Alert>
        ) : null}
        <div className="mt-5 grid gap-4">
          <Input
            label="Nombre completo"
            name="fullName"
            defaultValue={user && !isAnonymous ? profile?.fullName : undefined}
            placeholder="Ej.: María Fernández"
            autoComplete="name"
            required
          />
          <Input
            label="Número de teléfono"
            name="phone"
            placeholder="Ej.: 71234567"
            inputMode="tel"
            autoComplete="tel"
            hint="Puede ser tu número de WhatsApp o el de la persona que pagará."
            defaultValue={user && !isAnonymous ? (profile?.phoneE164 ?? "") : undefined}
            required
          />
          <label className="flex items-start gap-3 rounded-xl bg-surface-soft p-4 text-sm leading-6">
            <input
              className="mt-1 h-5 w-5 shrink-0 accent-accent"
              type="checkbox"
              name="terms"
              value="accepted"
              required
            />
            <span>
              Leí y acepto las{" "}
              <a className="font-bold text-accent underline" href="/condiciones">
                condiciones de compra
              </a>{" "}
              y la{" "}
              <a className="font-bold text-accent underline" href="/privacidad">
                política de privacidad
              </a>
              .
            </span>
          </label>
          {needsAnonymousSession && siteKey ? (
            <TurnstileWidget siteKey={siteKey} onToken={handleCaptchaToken} />
          ) : null}
          {needsAnonymousSession && localCaptchaBypass ? (
            <p className="text-sm text-muted">
              Verificación omitida solamente en el entorno local.
            </p>
          ) : null}
        </div>
      </Card>
      <Card className="h-fit p-5">
        <h2 className="text-xl font-bold">Total del pedido</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted">1 × Relief Sun</span>
            <span>{formatBob(168)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">2 × Juicy Tint</span>
            <span>{formatBob(238)}</span>
          </div>
        </div>
        <div className="mt-4 flex justify-between border-t border-border pt-4 text-xl font-black">
          <span>Total</span>
          <span>{formatBob(406)}</span>
        </div>
        <Button
          className="mt-5 w-full"
          type="submit"
          disabled={
            busy ||
            !configured ||
            (needsAnonymousSession && !siteKey && !localCaptchaBypass)
          }
        >
          {busy ? "Preparando…" : "Confirmar pedido"}
        </Button>
        <ButtonLink href="/carrito" className="mt-2 w-full" variant="ghost">
          Volver al carrito
        </ButtonLink>
        <MockNotice className="mt-4" />
      </Card>
    </form>
  );
}
