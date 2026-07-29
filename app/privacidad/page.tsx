import type { Metadata } from "next";

import { CustomerShell } from "@/components/layout/customer-shell";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <p className="text-sm font-bold text-accent">Versión para revisión legal</p>
        <h1 className="mt-1 text-3xl font-black">Política de privacidad</h1>
        <div className="mt-6 max-w-3xl space-y-5 leading-7 text-muted">
          <section aria-labelledby="privacy-data">
            <h2 id="privacy-data" className="text-lg font-bold text-foreground">
              Datos que utilizamos
            </h2>
            <p className="mt-2">
              Para pedidos de invitado solicitamos nombre y teléfono. Si creas una cuenta,
              también tratamos tu correo, nombre, teléfono e historial de pedidos. La
              administración puede adjuntar comprobantes de pago como evidencia privada.
            </p>
          </section>
          <section aria-labelledby="privacy-purpose">
            <h2 id="privacy-purpose" className="text-lg font-bold text-foreground">
              Para qué los utilizamos
            </h2>
            <p className="mt-2">
              Usamos estos datos para identificar el pedido, verificar el pago, coordinar
              la compra y entrega, responder consultas, gestionar cancelaciones o
              reembolsos y conservar un historial operativo y financiero.
            </p>
          </section>
          <section aria-labelledby="privacy-access">
            <h2 id="privacy-access" className="text-lg font-bold text-foreground">
              Acceso y protección
            </h2>
            <p className="mt-2">
              Los clientes con cuenta solo pueden consultar sus propios pedidos. Los
              pedidos de invitado no se vinculan automáticamente a una cuenta futura por
              coincidencia de teléfono. Los comprobantes de pago son privados y solo la
              administración autorizada puede abrirlos.
            </p>
          </section>
          <section aria-labelledby="privacy-providers">
            <h2 id="privacy-providers" className="text-lg font-bold text-foreground">
              Proveedores técnicos
            </h2>
            <p className="mt-2">
              La información puede procesarse en servicios de autenticación, base de
              datos, almacenamiento y alojamiento necesarios para operar Belle Perle.
              Estos proveedores no reciben autorización para utilizar tus datos con fines
              publicitarios propios.
            </p>
          </section>
          <section aria-labelledby="privacy-retention">
            <h2 id="privacy-retention" className="text-lg font-bold text-foreground">
              Conservación
            </h2>
            <p className="mt-2">
              Conservaremos los datos durante la campaña y por el tiempo necesario para
              atender entregas, devoluciones, reclamos y obligaciones aplicables. Los
              comprobantes administrativos se conservan como evidencia y no se eliminan
              automáticamente.
            </p>
          </section>
          <section aria-labelledby="privacy-rights">
            <h2 id="privacy-rights" className="text-lg font-bold text-foreground">
              Consultas y correcciones
            </h2>
            <p className="mt-2">
              Puedes pedir información o corrección de tus datos escribiendo al WhatsApp{" "}
              <a
                className="font-bold text-accent underline underline-offset-4"
                href="https://wa.me/59177912632"
              >
                +591 77912632
              </a>
              . Antes de revelar o cambiar información podremos solicitar datos que
              permitan verificar que eres la persona titular del pedido.
            </p>
          </section>
        </div>
      </main>
    </CustomerShell>
  );
}
