import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProductVisual } from "@/components/products/product-visual";
import { formatBob } from "@/lib/money/format";
import type { Product, ProductAvailability } from "@/types/product";

const availabilityCopy: Record<
  ProductAvailability,
  { label: string; variant: "success" | "warning" | "neutral"; action: string }
> = {
  available: { label: "Disponible", variant: "success", action: "Agregar" },
  reserved: { label: "Reservado", variant: "warning", action: "Sin unidades" },
  sold_out: { label: "Agotado", variant: "neutral", action: "Agotado" },
  expired: { label: "Precio vencido", variant: "warning", action: "Precio vencido" },
};

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const state = availabilityCopy[product.availability];
  const detailHref = `/producto?id=${product.id}`;
  const actionStyles =
    product.availability === "available"
      ? "bg-accent text-white shadow-sm group-hover:bg-accent-strong"
      : "border border-border bg-surface text-foreground group-hover:border-accent/35 group-hover:bg-accent-soft";

  return (
    <Link
      href={detailHref}
      className="group block rounded-3xl"
      aria-label={`Ver detalle de ${product.name}`}
    >
      <Card className="h-full overflow-hidden transition group-hover:-translate-y-1 group-hover:border-accent/35 group-hover:shadow-[0_18px_50px_rgba(76,48,57,0.12)]">
        <ProductVisual product={product} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-wide text-accent uppercase">
                {product.brand}
              </p>
              <h3 className="mt-1 text-lg leading-6 font-bold">{product.name}</h3>
              <p className="mt-1 text-sm text-muted">{product.category}</p>
            </div>
            <Badge variant={state.variant}>{state.label}</Badge>
          </div>
          <p className="mt-5 text-2xl font-bold">
            {product.priceBob === null
              ? "Precio por actualizar"
              : formatBob(product.priceBob)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {product.availability === "expired"
              ? "Esperando la actualización de la cotización oficial."
              : product.priceValidUntil
                ? `Válido hasta ${product.priceValidUntil}`
                : "Vigencia por confirmar"}
          </p>
          <span
            className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 text-base font-semibold transition-colors ${actionStyles}`}
            aria-hidden="true"
          >
            {product.availability === "available" ? "Ver y agregar" : "Ver detalle"}
          </span>
        </div>
      </Card>
    </Link>
  );
}
