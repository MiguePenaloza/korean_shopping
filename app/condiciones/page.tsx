import { CustomerShell } from "@/components/layout/customer-shell";

export default function TermsPage() {
  return (
    <CustomerShell>
      <main className="page-container prose-copy">
        <p className="text-sm font-bold text-accent">Borrador para revisión</p>
        <h1 className="mt-1 text-3xl font-black">Condiciones de compra</h1>
        <div className="mt-6 max-w-3xl space-y-5 leading-7 text-muted">
          <p>
            El pedido se confirma únicamente después de verificar el pago completo. Crear
            un pedido genera una reserva temporal, no una compra definitiva.
          </p>
          <p>
            Los precios dependen de la cotización y tienen una hora de vigencia visible.
            Si el pago llega después del vencimiento, el pedido normalmente se cancela y
            se coordina la devolución por QR; el administrador puede aceptar
            excepcionalmente la compra si todavía es posible realizarla.
          </p>
          <p>
            Al tratarse de productos comprados por encargo en Corea, no se aceptan
            cancelaciones después de verificar el pago y realizar la compra, salvo error
            atribuible a Belle Perle o imposibilidad de adquirir el producto.
          </p>
        </div>
      </main>
    </CustomerShell>
  );
}
