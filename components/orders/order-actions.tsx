"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MockNotice } from "@/components/ui/mock-notice";

export function OrderActions() {
  const [message, setMessage] = useState("");

  const simulate = (kind: "qr" | "paid") => {
    setMessage(
      kind === "qr"
        ? "Mensaje preparado: “Hola, quiero solicitar el QR para pagar y confirmar mi pedido BP-2607-123. Total: Bs 406. Nombre: María Fernández.”"
        : "Mensaje preparado: “Hola, ya realicé el pago del pedido BP-2607-123 por Bs 406. Por favor, verifica el pago.”",
    );
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button onClick={() => simulate("qr")}>Solicitar QR por WhatsApp</Button>
        <Button variant="secondary" onClick={() => simulate("paid")}>
          Avisar pago realizado
        </Button>
      </div>
      {message && (
        <div
          className="mt-4 rounded-xl bg-success-soft p-4 text-sm leading-6 text-success"
          role="status"
        >
          {message}
          <p className="mt-2 font-bold">En esta fase no se abrirá WhatsApp.</p>
        </div>
      )}
      <MockNotice className="mt-4" />
    </div>
  );
}
