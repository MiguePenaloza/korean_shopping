import type { Metadata } from "next";

import { CustomerShell } from "@/components/layout/customer-shell";

export const metadata: Metadata = { title: "Condiciones de compra" };

export default function TermsPage() {
  return (
    <CustomerShell>
      <main className="page-container prose-copy">
        <p className="text-sm font-bold text-accent">Versión para revisión legal</p>
        <h1 className="mt-1 text-3xl font-black">Condiciones de compra</h1>
        <div className="mt-6 max-w-3xl space-y-5 leading-7 text-muted">
          <section aria-labelledby="terms-order">
            <h2 id="terms-order" className="text-lg font-bold text-foreground">
              Pedido y confirmación
            </h2>
            <p className="mt-2">
              Crear un pedido genera una reserva temporal de 15 minutos. Avisar el pago
              dentro de ese plazo amplía la reserva hasta el minuto 25, pero el pedido se
              confirma únicamente cuando Belle Perle verifica el pago completo.
            </p>
          </section>
          <section aria-labelledby="terms-price">
            <h2 id="terms-price" className="text-lg font-bold text-foreground">
              Precio y vigencia
            </h2>
            <p className="mt-2">
              El precio final aparece en bolivianos e incluye la conversión y los
              componentes informados al publicar el producto. Cada precio tiene una hora
              de vencimiento visible. Un producto con precio vencido no puede añadirse al
              carrito hasta que la administración confirme una nueva cotización.
            </p>
          </section>
          <section aria-labelledby="terms-availability">
            <h2 id="terms-availability" className="text-lg font-bold text-foreground">
              Disponibilidad
            </h2>
            <p className="mt-2">
              La disponibilidad mostrada antes del pago es informativa y vuelve a
              verificarse al confirmar el pedido. Si un producto deja de estar disponible
              antes de confirmar el pago, coordinaremos la cancelación o una alternativa
              contigo.
            </p>
          </section>
          <section aria-labelledby="terms-cancellation">
            <h2 id="terms-cancellation" className="text-lg font-bold text-foreground">
              Cancelaciones y pagos vencidos
            </h2>
            <p className="mt-2">
              Puedes solicitar la cancelación antes de que el pago sea confirmado. Una vez
              verificado el pago y realizada la compra por encargo en Corea, no se aceptan
              cancelaciones por cambio de opinión, salvo que exista un error atribuible a
              Belle Perle o no sea posible adquirir el producto.
            </p>
            <p className="mt-2">
              Si el pago llega después del vencimiento, normalmente cancelaremos el pedido
              y coordinaremos la devolución al QR que nos indiques. Solo de manera
              excepcional podremos aceptarlo si todavía existe stock y tiempo para
              comprar, dejando registrada la decisión administrativa.
            </p>
          </section>
          <section aria-labelledby="terms-refund">
            <h2 id="terms-refund" className="text-lg font-bold text-foreground">
              Reembolsos
            </h2>
            <p className="mt-2">
              Cuando corresponda un reembolso, primero aparecerá como pendiente y después
              como reembolsado una vez realizada la devolución. La coordinación se hará
              por WhatsApp y podremos solicitar los datos necesarios del QR receptor.
            </p>
          </section>
          <section aria-labelledby="terms-contact">
            <h2 id="terms-contact" className="text-lg font-bold text-foreground">
              Consultas
            </h2>
            <p className="mt-2">
              Para consultar, corregir o cancelar un pedido, escríbenos al WhatsApp{" "}
              <a
                className="font-bold text-accent underline underline-offset-4"
                href="https://wa.me/59177912632"
              >
                +591 77912632
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </CustomerShell>
  );
}
