import Link from "next/link";

import { ProductVisual } from "@/components/products/product-visual";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mockProducts } from "@/lib/mock-data/products";
import { formatBob } from "@/lib/money/format";

export default function AdminProductsPage() {
  return (
    <main className="page-container">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-accent">Inventario</p>
          <h1 className="mt-1 text-3xl font-black">Productos</h1>
        </div>
        <ButtonLink href="/admin/productos/nuevo">Crear producto</ButtonLink>
      </div>
      <div className="mt-6 grid gap-4">
        {mockProducts.map((product) => (
          <Card key={product.id} className="flex items-center gap-4 p-4">
            <ProductVisual product={product} className="h-20 w-20 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Link
                className="font-bold hover:text-accent"
                href={`/producto?id=${product.id}`}
              >
                {product.name}
              </Link>
              <p className="text-sm text-muted">
                {product.code} · {formatBob(product.priceBob ?? 0)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  variant={product.availability === "available" ? "success" : "warning"}
                >
                  {product.availability === "available"
                    ? "Disponible"
                    : product.availability === "expired"
                      ? "Precio vencido"
                      : product.availability === "sold_out"
                        ? "Agotado"
                        : "Reservado"}
                </Badge>
                <Badge variant="neutral">4 totales · 2 confirmadas · 2 restantes</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
