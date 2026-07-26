import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const colorStyles: Record<Product["color"], string> = {
  rose: "from-[#f6dce4] to-[#fff6f7]",
  mint: "from-[#dceee7] to-[#f6fbf8]",
  lilac: "from-[#e6def1] to-[#faf7fd]",
};

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const state = availabilityCopy[product.availability];

  return (
    <Card className="overflow-hidden">
      <div
        role="img"
        aria-label={`Espacio reservado para la fotografía de ${product.name}`}
        className={`flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${colorStyles[product.color]}`}
      >
        <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-muted">
          Fotografía del producto
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-accent uppercase">
              {product.category}
            </p>
            <h3 className="mt-1 text-lg leading-6 font-bold">{product.name}</h3>
          </div>
          <Badge variant={state.variant}>{state.label}</Badge>
        </div>
        <p className="mt-5 text-2xl font-bold">{formatBob(product.priceBob)}</p>
        <p className="mt-1 text-sm text-muted">
          {product.availability === "expired"
            ? "Esperando la actualización de la cotización oficial."
            : `Válido hasta ${product.priceValidUntil}`}
        </p>
        <Button
          className="mt-5 w-full"
          disabled
          aria-label={`${state.action}: funcionalidad disponible en una fase posterior`}
        >
          {state.action}
        </Button>
      </div>
    </Card>
  );
}
