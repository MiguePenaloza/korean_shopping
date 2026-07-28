"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useCart } from "@/components/cart/cart-provider";
import { ProductVisual } from "@/components/products/product-visual";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCatalogueProductsByIds } from "@/lib/catalogue/catalogue";
import { formatBob } from "@/lib/money/format";
import type { Product } from "@/types/product";

export function CartPrototype() {
  const { configured } = useAuth();
  const { items, ready, removeItem, setQuantity } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const revalidate = useCallback(async () => {
    if (!configured || !items.length) {
      setProducts([]);
      setStatus("ready");
      return;
    }
    setStatus("loading");
    try {
      setProducts(await getCatalogueProductsByIds(items.map((item) => item.productId)));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [configured, items]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      void revalidate();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready, revalidate]);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const hasUnavailable = items.some((item) => {
    const product = productById.get(item.productId);
    return !product || product.availability !== "available" || product.priceBob === null;
  });
  const total = items.reduce((sum, item) => {
    const price = productById.get(item.productId)?.priceBob;
    return sum + (price ?? 0) * item.quantity;
  }, 0);

  if (!ready) {
    return (
      <p className="mt-6 text-muted" role="status">
        Cargando carrito…
      </p>
    );
  }

  if (!items.length) {
    return (
      <div className="mt-6">
        <EmptyState
          title="Tu carrito está vacío"
          description="Agrega productos disponibles antes de confirmar un pedido."
          action={<ButtonLink href="/buscar">Buscar productos</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        {status === "error" ? (
          <Alert title="No pudimos actualizar el carrito" role="alert">
            Revisa tu conexión y vuelve a intentar antes de continuar.
            <Button className="mt-3" size="sm" onClick={() => void revalidate()}>
              Reintentar
            </Button>
          </Alert>
        ) : null}
        {items.map((item) => {
          const product = productById.get(item.productId);
          if (!product) {
            return (
              <Card key={item.productId} className="p-4">
                <h2 className="font-bold">Producto no disponible</h2>
                <p className="mt-1 text-sm text-muted">
                  Este producto ya no está publicado. Quítalo para continuar.
                </p>
                <Button
                  className="mt-3"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.productId)}
                >
                  Quitar
                </Button>
              </Card>
            );
          }

          const available =
            product.availability === "available" && product.priceBob !== null;
          return (
            <Card key={product.id} className="flex gap-4 p-4">
              <ProductVisual
                product={product}
                className="h-28 w-28 shrink-0 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-accent">{product.brand}</p>
                <h2 className="mt-1 font-bold">{product.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {product.priceBob === null
                    ? "Precio por actualizar"
                    : `${formatBob(product.priceBob)} c/u`}
                </p>
                {!available ? (
                  <p className="mt-2 text-sm font-semibold text-warning">
                    {product.availability === "expired"
                      ? "Precio vencido. Quítalo o espera la nueva cotización."
                      : "Sin unidades disponibles en este momento."}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex h-11 items-center rounded-lg border border-border">
                    <button
                      type="button"
                      className="h-full w-11"
                      aria-label={`Disminuir ${product.name}`}
                      onClick={() => setQuantity(product.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="w-9 text-center font-bold">{item.quantity}</span>
                    <button
                      type="button"
                      className="h-full w-11"
                      aria-label={`Aumentar ${product.name}`}
                      disabled={item.quantity >= 20}
                      onClick={() => setQuantity(product.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <strong>{formatBob((product.priceBob ?? 0) * item.quantity)}</strong>
                </div>
                <Button
                  className="mt-2"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(product.id)}
                >
                  Quitar
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="h-fit p-5 lg:sticky lg:top-24">
        <h2 className="text-xl font-bold">Resumen actualizado</h2>
        <div className="mt-4 flex justify-between text-muted">
          <span>Productos</span>
          <span>{formatBob(total)}</span>
        </div>
        <div className="mt-4 flex justify-between border-t border-border pt-4 text-xl font-black">
          <span>Total</span>
          <span>{formatBob(total)}</span>
        </div>
        <p className="mt-3 text-sm leading-5 text-muted">
          El precio y la cantidad se validarán nuevamente en PostgreSQL al confirmar. El
          carrito todavía no reserva unidades.
        </p>
        {status === "ready" && !hasUnavailable && configured ? (
          <ButtonLink href="/checkout" className="mt-5 w-full">
            Continuar
          </ButtonLink>
        ) : (
          <Button className="mt-5 w-full" disabled>
            {status === "loading" ? "Actualizando…" : "Revisa el carrito"}
          </Button>
        )}
        <ButtonLink href="/buscar" variant="ghost" className="mt-2 w-full">
          Seguir comprando
        </ButtonLink>
      </Card>
    </div>
  );
}
