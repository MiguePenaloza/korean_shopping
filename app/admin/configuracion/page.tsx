import { BulkPricing } from "@/components/admin/bulk-pricing";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <main className="page-container">
      <p className="text-sm font-bold text-accent">Campaña y cotización</p>
      <h1 className="mt-1 text-3xl font-black">Configuración de precios</h1>
      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Actualizar tasa y precios</h2>
        <p className="mt-2 mb-5 max-w-3xl text-sm leading-6 text-muted">
          Los productos vencidos nunca se reactivarán automáticamente. Primero revisa la
          previsualización y luego confirma.
        </p>
        <BulkPricing />
      </Card>
      <Card className="mt-5 p-5">
        <h2 className="text-lg font-bold">Horario visible en Bolivia</h2>
        <p className="mt-2 text-muted">
          Expiración diaria configurada: 08:15 · Zona horaria: America/La_Paz.
        </p>
      </Card>
    </main>
  );
}
