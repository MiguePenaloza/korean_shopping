"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { ProductVisual } from "@/components/products/product-visual";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MockNotice } from "@/components/ui/mock-notice";
import { findMockProduct } from "@/lib/mock-data/products";
import { formatBob } from "@/lib/money/format";

export function ProductDetail() {
  const params = useSearchParams();
  const product = findMockProduct(params.get("id"));
  const [added, setAdded] = useState(false);
  const available = product.availability === "available";
  const status =
    product.availability === "available"
      ? "Disponible"
      : product.availability === "reserved"
        ? "Reservado"
        : product.availability === "sold_out"
          ? "Agotado"
          : "Precio vencido";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <ProductVisual product={product} className="rounded-3xl lg:aspect-square" />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={available ? "success" : "warning"}>{status}</Badge>
          <span className="text-sm text-muted">{product.code}</span>
        </div>
        <p className="mt-5 text-sm font-bold tracking-wide text-accent uppercase">
          {product.brand}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
          {product.name}
        </h1>
        <p className="mt-2 font-semibold text-muted">{product.variant}</p>
        <p className="mt-5 text-base leading-7 text-muted">{product.description}</p>
        <p className="mt-7 text-3xl font-black">{formatBob(product.priceBob)}</p>

        {product.availability === "expired" ? (
          <Alert className="mt-4" title="Este precio está vencido">
            Espera la actualización de la cotización oficial del dólar. El producto
            volverá a estar disponible cuando el administrador confirme el nuevo precio.
          </Alert>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Precio válido hasta {product.priceValidUntil}
          </p>
        )}

        <Card className="mt-6 p-4">
          <p className="text-sm font-bold">Cantidad</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex h-12 items-center rounded-xl border border-border">
              <button
                className="h-full w-12 text-xl"
                type="button"
                aria-label="Disminuir cantidad"
              >
                −
              </button>
              <span className="w-12 text-center font-bold">1</span>
              <button
                className="h-full w-12 text-xl"
                type="button"
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>
            <span className="text-sm text-muted">Máximo simulado: 2</span>
          </div>
          {available ? (
            added ? (
              <ButtonLink href="/carrito" className="mt-4 w-full">
                Ver carrito
              </ButtonLink>
            ) : (
              <Button className="mt-4 w-full" onClick={() => setAdded(true)}>
                Agregar al carrito
              </Button>
            )
          ) : (
            <Button className="mt-4 w-full" disabled>
              {status}
            </Button>
          )}
        </Card>
        <MockNotice className="mt-4" />
      </div>
    </div>
  );
}
