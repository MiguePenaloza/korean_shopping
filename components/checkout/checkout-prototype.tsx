"use client";

import { useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MockNotice } from "@/components/ui/mock-notice";
import { formatBob } from "@/lib/money/format";

export function CheckoutPrototype() {
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <Card className="mx-auto mt-8 max-w-xl p-6 text-center sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-2xl text-success">
          ✓
        </span>
        <p className="mt-5 text-sm font-bold text-accent">Pedido BP-2607-123</p>
        <h1 className="mt-2 text-3xl font-black">¡Pedido reservado!</h1>
        <p className="mt-3 leading-7 text-muted">
          Tienes 15 minutos para solicitar el QR. Después de avisar el pago, el límite
          simulado se extiende hasta el minuto 25.
        </p>
        <ButtonLink href="/pedido-confirmado" className="mt-6 w-full">
          Ver instrucciones de pago
        </ButtonLink>
      </Card>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-bold">Tus datos</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          No necesitas correo ni contraseña. Usaremos tu nombre y teléfono para coordinar
          este pedido por WhatsApp.
        </p>
        <div className="mt-5 grid gap-4">
          <Input
            label="Nombre completo"
            placeholder="Ej.: María Fernández"
            autoComplete="name"
          />
          <Input
            label="Número de teléfono"
            placeholder="Ej.: 71234567"
            inputMode="tel"
            autoComplete="tel"
            hint="Puede ser tu número de WhatsApp o el de la persona que pagará."
          />
          <label className="flex items-start gap-3 rounded-xl bg-surface-soft p-4 text-sm leading-6">
            <input className="mt-1 h-5 w-5 shrink-0 accent-accent" type="checkbox" />
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
        <Button className="mt-5 w-full" onClick={() => setConfirmed(true)}>
          Confirmar pedido
        </Button>
        <ButtonLink href="/carrito" className="mt-2 w-full" variant="ghost">
          Volver al carrito
        </ButtonLink>
        <MockNotice className="mt-4" />
      </Card>
    </div>
  );
}
