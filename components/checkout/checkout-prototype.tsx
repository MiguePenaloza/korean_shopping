"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { useCart } from "@/components/cart/cart-provider";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ensureGuestSession } from "@/lib/auth/guest-session";
import { getCustomerAuthMessage } from "@/lib/auth/messages";
import { isValidFullName, normalizeBolivianPhoneInput } from "@/lib/auth/validation";
import {
  cartFingerprint,
  checkoutAttemptStorageKey,
  resolveCheckoutAttempt,
} from "@/lib/cart/cart";
import { getCatalogueProductsByIds } from "@/lib/catalogue/catalogue";
import { formatBob } from "@/lib/money/format";
import { submitOrder } from "@/lib/orders/orders";
import type { Product } from "@/types/product";

function checkoutErrorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "ORDERING_CLOSED") {
    return "Los pedidos están cerrados temporalmente.";
  }
  if (code === "PRICE_EXPIRED") {
    return "El precio de un producto venció. Vuelve al carrito para actualizarlo.";
  }
  if (code === "ITEM_UNAVAILABLE" || code === "INSUFFICIENT_STOCK") {
    return "Una cantidad ya no está disponible. Vuelve al carrito y actualízalo.";
  }
  return "No pudimos confirmar el pedido. Revisa tu conexión e inténtalo otra vez.";
}

export function CheckoutPrototype() {
  const router = useRouter();
  const { configured, isAnonymous, loading: authLoading, profile, user } = useAuth();
  const { clearCart, items, ready } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [captchaToken, setCaptchaToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const localCaptchaBypass = process.env.NODE_ENV !== "production" && !siteKey;
  const needsAnonymousSession = !user;

  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const revalidate = useCallback(async () => {
    if (!configured || !items.length) {
      setProducts([]);
      setStatus("ready");
      return [];
    }
    setStatus("loading");
    try {
      const current = await getCatalogueProductsByIds(
        items.map((item) => item.productId),
      );
      setProducts(current);
      setStatus("ready");
      return current;
    } catch {
      setStatus("error");
      return [];
    }
  }, [configured, items]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      void revalidate();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready, revalidate]);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const validCart =
    items.length > 0 &&
    products.length === items.length &&
    items.every((item) => {
      const product = productById.get(item.productId);
      return product?.availability === "available" && product.priceBob !== null;
    });
  const total = items.reduce(
    (sum, item) => sum + (productById.get(item.productId)?.priceBob ?? 0) * item.quantity,
    0,
  );

  async function confirmCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const customerName = String(form.get("customerName") ?? "").trim();
    const phone = normalizeBolivianPhoneInput(String(form.get("phone") ?? ""));

    if (!isValidFullName(customerName)) {
      setMessage("Escribe un nombre válido.");
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
      setMessage("La conexión segura todavía no está configurada.");
      return;
    }
    if (!items.length) {
      setMessage("Tu carrito está vacío.");
      return;
    }
    if (needsAnonymousSession && !captchaToken && !localCaptchaBypass) {
      setMessage("Completa la verificación de seguridad antes de continuar.");
      return;
    }

    submitting.current = true;
    setBusy(true);
    setMessage("");
    try {
      const currentProducts = await revalidate();
      const currentById = new Map(
        currentProducts.map((product) => [product.id, product]),
      );
      const stillValid =
        currentProducts.length === items.length &&
        items.every((item) => {
          const product = currentById.get(item.productId);
          return product?.availability === "available" && product.priceBob !== null;
        });
      if (!stillValid) {
        setMessage(
          "El precio o la disponibilidad cambió. Revisa el carrito antes de continuar.",
        );
        return;
      }

      if (!user) {
        await ensureGuestSession(captchaToken || undefined);
      }

      const fingerprint = cartFingerprint(items);
      const attempt = resolveCheckoutAttempt(
        window.sessionStorage.getItem(checkoutAttemptStorageKey),
        fingerprint,
        () => crypto.randomUUID(),
      );
      window.sessionStorage.setItem(checkoutAttemptStorageKey, JSON.stringify(attempt));

      const order = await submitOrder({
        idempotencyKey: attempt.idempotencyKey,
        customerName,
        phone,
        items,
      });
      clearCart();
      window.sessionStorage.removeItem(checkoutAttemptStorageKey);
      router.push(`/pedido-confirmado?id=${encodeURIComponent(order.id)}`);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "SUPABASE_NOT_CONFIGURED" ||
          error.message.includes("ANONYMOUS"))
      ) {
        setMessage(getCustomerAuthMessage(error, "guest"));
      } else {
        setMessage(checkoutErrorMessage(error));
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!ready || status === "loading" || authLoading) {
    return (
      <p className="mt-6 text-muted" role="status">
        Actualizando pedido…
      </p>
    );
  }

  if (!items.length) {
    return (
      <div className="mt-6">
        <EmptyState
          title="Tu carrito está vacío"
          description="Agrega productos antes de confirmar un pedido."
          action={<ButtonLink href="/buscar">Buscar productos</ButtonLink>}
        />
      </div>
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
            Estás comprando con tu cuenta. El pedido quedará asociado de forma segura a tu
            perfil.
          </p>
        ) : null}
        {!configured ? (
          <Alert className="mt-4" title="Configuración local pendiente">
            Agrega las variables públicas de Supabase para confirmar pedidos.
          </Alert>
        ) : null}
        {status === "error" ? (
          <Alert className="mt-4" title="No pudimos actualizar el pedido">
            Regresa al carrito y revisa tu conexión.
          </Alert>
        ) : null}
        {!validCart && status === "ready" ? (
          <Alert className="mt-4" title="El carrito cambió">
            Un producto ya no tiene precio o disponibilidad vigente. Regresa al carrito
            para revisarlo.
          </Alert>
        ) : null}
        {message ? (
          <Alert className="mt-4" title="Revisa el pedido" role="alert">
            {message}
          </Alert>
        ) : null}
        <div className="mt-5 grid gap-4">
          <Input
            label="Nombre"
            name="customerName"
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
        <h2 className="text-xl font-bold">Total actualizado</h2>
        <div className="mt-4 space-y-3 text-sm">
          {items.map((item) => {
            const product = productById.get(item.productId);
            return (
              <div key={item.productId} className="flex justify-between gap-4">
                <span className="text-muted">
                  {item.quantity} × {product?.name ?? "Producto no disponible"}
                </span>
                <span>{formatBob((product?.priceBob ?? 0) * item.quantity)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between border-t border-border pt-4 text-xl font-black">
          <span>Total</span>
          <span>{formatBob(total)}</span>
        </div>
        <p className="mt-3 text-sm leading-5 text-muted">
          Al confirmar, PostgreSQL volverá a validar precios e inventario y reservará las
          unidades durante 15 minutos.
        </p>
        <Button
          className="mt-5 w-full"
          type="submit"
          disabled={
            busy ||
            !configured ||
            !validCart ||
            status !== "ready" ||
            (needsAnonymousSession && !siteKey && !localCaptchaBypass)
          }
        >
          {busy ? "Confirmando…" : "Confirmar pedido"}
        </Button>
        <ButtonLink href="/carrito" className="mt-2 w-full" variant="ghost">
          Volver al carrito
        </ButtonLink>
      </Card>
    </form>
  );
}
