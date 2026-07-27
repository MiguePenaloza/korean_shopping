import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MockNotice } from "@/components/ui/mock-notice";

export default function AdminDashboardPage() {
  const metrics = [
    ["Pedidos por revisar", "3"],
    ["Unidades confirmadas", "7"],
    ["Unidades restantes", "11"],
    ["Precios vencidos", "4"],
  ];
  return (
    <main className="page-container">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-accent">Domingo, 26 de julio</p>
          <h1 className="mt-1 text-3xl font-black">Resumen del viaje</h1>
        </div>
        <Badge variant="success">Pedidos abiertos</Badge>
      </div>
      <MockNotice className="mt-5" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Link href="/admin/productos/nuevo">
          <Card className="p-6 hover:border-accent">
            <p className="text-sm font-bold text-accent">Acción rápida</p>
            <h2 className="mt-2 text-2xl font-bold">Crear producto</h2>
            <p className="mt-2 text-muted">
              Fotografía, precio KRW, cantidad y ganancia.
            </p>
          </Card>
        </Link>
        <Link href="/admin/pedidos">
          <Card className="p-6 hover:border-accent">
            <p className="text-sm font-bold text-accent">Pendientes</p>
            <h2 className="mt-2 text-2xl font-bold">Revisar pagos</h2>
            <p className="mt-2 text-muted">
              Hay un aviso de pago esperando verificación.
            </p>
          </Card>
        </Link>
      </div>
    </main>
  );
}
