"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ProductVisual } from "@/components/products/product-visual";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MockNotice } from "@/components/ui/mock-notice";
import { getCatalogueProduct } from "@/lib/catalogue/catalogue";
import { formatBob } from "@/lib/money/format";
import type { Product } from "@/types/product";

type ProductState = {
  id: string;
  status: "loading" | "ready" | "missing" | "error";
  product: Product | null;
};

export function ProductDetail() {
  const params = useSearchParams();
  const { configured } = useAuth();
  const id = params.get("id") ?? "";
  const [state, setState] = useState<ProductState>({
    id: "",
    status: "loading",
    product: null,
  });
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!configured) return;
    let active = true;

    void getCatalogueProduct(id)
      .then((product) => {
        if (!active) return;
        setState({
          id,
          status: product ? "ready" : "missing",
          product,
        });
      })
      .catch(() => {
        if (active) setState({ id, status: "error", product: null });
      });

    return () => {
      active = false;
    };
  }, [configured, id]);

  if (!configured) {
    return (
      <EmptyState
        title="Catálogo no conectado"
        description="Configura la conexión pública de Supabase para consultar este producto."
      />
    );
  }

  if (state.id !== id || state.status === "loading") {
    return (
      <p className="text-muted" role="status">
        Cargando producto…
      </p>
    );
  }

  if (state.status === "missing") {
    return (
      <EmptyState
        title="Producto no encontrado"
        description="Puede que ya no esté publicado o que el enlace no sea correcto."
        action={<ButtonLink href="/buscar">Volver al catálogo</ButtonLink>}
      />
    );
  }

  if (state.status === "error" || !state.product) {
    return (
      <EmptyState
        title="No pudimos cargar el producto"
        description="Revisa tu conexión y vuelve a intentarlo desde el catálogo."
        action={<ButtonLink href="/buscar">Volver al catálogo</ButtonLink>}
      />
    );
  }

  const product = state.product;
  const productImages = product.images ?? [];
  const activeImage = productImages[selectedImage] ?? productImages[0];
  const available = product.availability === "available";
  const status =
    product.availability === "available"
      ? "Disponible"
      : product.availability === "reserved"
        ? "Reservado"
        : product.availability === "sold_out"
          ? "Agotado"
          : "Precio vencido";
  const badgeVariant =
    product.availability === "available"
      ? "success"
      : product.availability === "sold_out"
        ? "neutral"
        : "warning";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <div>
        {activeImage ? (
          <div className="aspect-square overflow-hidden rounded-3xl bg-surface-soft">
            {/* Full product images are pre-compressed to a maximum of 1200 px. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage.url}
              alt={activeImage.alt}
              className="h-full w-full object-contain"
              decoding="async"
            />
          </div>
        ) : (
          <ProductVisual product={product} className="rounded-3xl lg:aspect-square" />
        )}
        {productImages.length > 1 ? (
          <div className="mt-3 flex gap-3" aria-label="Fotografías del producto">
            {productImages.map((image, index) => (
              <button
                key={image.url}
                type="button"
                className={`h-20 w-20 overflow-hidden rounded-xl border-2 ${
                  selectedImage === index ? "border-accent" : "border-transparent"
                }`}
                aria-label={`Ver fotografía ${index + 1}`}
                aria-pressed={selectedImage === index}
                onClick={() => setSelectedImage(index)}
              >
                {/* Product thumbnails are pre-compressed to 480 px during upload. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badgeVariant}>{status}</Badge>
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
        <p className="mt-7 text-3xl font-black">
          {product.priceBob === null
            ? "Precio por actualizar"
            : formatBob(product.priceBob)}
        </p>

        {product.availability === "expired" ? (
          <Alert className="mt-4" title="Este precio está vencido">
            Espera la actualización de la cotización oficial del dólar. El producto
            volverá a estar disponible cuando el administrador confirme el nuevo precio.
          </Alert>
        ) : (
          <p className="mt-2 text-sm text-muted">
            {product.priceValidUntil
              ? `Precio válido hasta ${product.priceValidUntil}`
              : "Vigencia por confirmar"}
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
            <span className="max-w-44 text-right text-sm text-muted">
              La disponibilidad se validará al confirmar.
            </span>
          </div>
          {available ? (
            addedProductId === product.id ? (
              <ButtonLink href="/carrito" className="mt-4 w-full">
                Ver carrito
              </ButtonLink>
            ) : (
              <Button
                className="mt-4 w-full"
                onClick={() => setAddedProductId(product.id)}
              >
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
