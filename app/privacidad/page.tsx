import { CustomerShell } from "@/components/layout/customer-shell";

export default function PrivacyPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <p className="text-sm font-bold text-accent">Borrador para revisión</p>
        <h1 className="mt-1 text-3xl font-black">Política de privacidad</h1>
        <div className="mt-6 max-w-3xl space-y-5 leading-7 text-muted">
          <p>
            Usaremos tu nombre y teléfono únicamente para identificar, coordinar y dar
            soporte a tus pedidos. Si creas una cuenta, también guardaremos tu correo y tu
            historial.
          </p>
          <p>
            Los comprobantes de pago que adjunte el administrador serán privados y
            accesibles solo para administración. No venderemos ni compartiremos tus datos
            con terceros para publicidad.
          </p>
          <p>
            Los pedidos de invitado no se vincularán automáticamente a una cuenta futura
            solo por coincidir el teléfono, para evitar accesos no autorizados.
          </p>
        </div>
      </main>
    </CustomerShell>
  );
}
