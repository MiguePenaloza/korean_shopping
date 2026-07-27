"use client";

import { useState } from "react";

import { ProductVisual } from "@/components/products/product-visual";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MockNotice } from "@/components/ui/mock-notice";
import { mockProducts } from "@/lib/mock-data/products";
import { formatBob } from "@/lib/money/format";

export function CartPrototype() {
  const [quantities, setQuantities] = useState([1, 2]);
  const items = [mockProducts[0]!, mockProducts[3]!] as const;
  const total = items.reduce(
    (sum, product, index) => sum + product.priceBob * (quantities[index] ?? 0),
    0,
  );

  const updateQuantity = (index: number, delta: number) => {
    setQuantities((current) =>
      current.map((value, itemIndex) =>
        itemIndex === index ? Math.max(0, Math.min(3, value + delta)) : value,
      ),
    );
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        {items.map((product, index) =>
          (quantities[index] ?? 0) > 0 ? (
            <Card key={product.id} className="flex gap-4 p-4">
              <ProductVisual
                product={product}
                className="h-28 w-28 shrink-0 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-accent">{product.brand}</p>
                <h2 className="mt-1 font-bold">{product.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {formatBob(product.priceBob)} c/u
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex h-10 items-center rounded-lg border border-border">
                    <button
                      type="button"
                      className="h-full w-10"
                      aria-label={`Disminuir ${product.name}`}
                      onClick={() => updateQuantity(index, -1)}
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-bold">
                      {quantities[index] ?? 0}
                    </span>
                    <button
                      type="button"
                      className="h-full w-10"
                      aria-label={`Aumentar ${product.name}`}
                      onClick={() => updateQuantity(index, 1)}
                    >
                      +
                    </button>
                  </div>
                  <strong>
                    {formatBob(product.priceBob * (quantities[index] ?? 0))}
                  </strong>
                </div>
              </div>
            </Card>
          ) : null,
        )}
      </div>
      <Card className="h-fit p-5 lg:sticky lg:top-24">
        <h2 className="text-xl font-bold">Resumen</h2>
        <div className="mt-4 flex justify-between text-muted">
          <span>Productos</span>
          <span>{formatBob(total)}</span>
        </div>
        <div className="mt-4 flex justify-between border-t border-border pt-4 text-xl font-black">
          <span>Total</span>
          <span>{formatBob(total)}</span>
        </div>
        <p className="mt-3 text-sm leading-5 text-muted">
          La disponibilidad y el precio se volverán a validar al confirmar.
        </p>
        <ButtonLink href="/checkout" className="mt-5 w-full">
          Continuar
        </ButtonLink>
        <ButtonLink href="/buscar" variant="ghost" className="mt-2 w-full">
          Seguir comprando
        </ButtonLink>
        <MockNotice className="mt-4" />
      </Card>
    </div>
  );
}
