"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  listAdminProducts,
  productPublicUrl,
  publishDraftProduct,
  shareProduct,
  type AdminProduct,
} from "@/lib/admin/products";
import { formatBob } from "@/lib/money/format";

function expirationLabel(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminProductList() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setProducts(await listAdminProducts());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void listAdminProducts()
      .then((rows) => {
        if (!active) return;
        setProducts(rows);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  async function publish(product: AdminProduct) {
    setWorkingId(product.id);
    setNotice("");
    try {
      await publishDraftProduct(product.id);
      setNotice(`${product.name} fue publicado correctamente.`);
      await load();
    } catch {
      setNotice(
        "No pudimos publicar el borrador. Verifica que exista una tasa vigente y stock disponible.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function share(product: AdminProduct) {
    setNotice("");
    try {
      const action = await shareProduct(product);
      setNotice(
        action === "copied"
          ? "El enlace del producto fue copiado."
          : "El producto fue compartido.",
      );
    } catch {
      setNotice("No pudimos compartir el producto en este dispositivo.");
    }
  }

  if (status === "loading") {
    return (
      <p className="mt-6 text-muted" role="status">
        Cargando productos…
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-6">
        <EmptyState
          title="No pudimos cargar los productos"
          description="Revisa la conexión y vuelve a intentarlo."
          action={<Button onClick={() => void load()}>Reintentar</Button>}
        />
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="mt-6">
        <EmptyState
          title="Todavía no hay productos"
          description="Crea el primer producto para comenzar el inventario."
        />
      </div>
    );
  }

  return (
    <>
      {notice ? (
        <p className="mt-5 rounded-xl bg-surface-soft p-4 text-sm" role="status">
          {notice}
        </p>
      ) : null}
      <div className="mt-6 grid gap-4">
        {products.map((product) => (
          <Card
            key={product.id}
            className="grid gap-4 p-4 sm:grid-cols-[5rem_1fr_auto] sm:items-center"
          >
            {product.thumbnailUrl ? (
              // Product thumbnails are pre-compressed to 480 px during upload.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.thumbnailUrl}
                alt=""
                className="h-20 w-20 rounded-xl bg-surface-soft object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-xl bg-surface-soft text-2xl"
                aria-hidden="true"
              >
                ♡
              </div>
            )}
            <div className="min-w-0">
              {product.status === "active" ? (
                <Link
                  className="font-bold hover:text-accent"
                  href={`/producto?id=${product.id}`}
                >
                  {product.name}
                </Link>
              ) : (
                <p className="font-bold">{product.name}</p>
              )}
              <p className="mt-1 text-sm text-muted">
                {product.code} · {product.brand} · {product.categoryName}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={product.status === "active" ? "success" : "neutral"}>
                  {product.status === "active"
                    ? "Publicado"
                    : product.status === "draft"
                      ? "Borrador"
                      : "Archivado"}
                </Badge>
                <Badge variant="neutral">
                  {product.totalStock} totales · {product.confirmedStock} confirmadas ·{" "}
                  {product.remainingStock} restantes
                </Badge>
                {product.reservedStock > 0 ? (
                  <Badge variant="warning">
                    {product.reservedStock} en reserva temporal
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 text-sm">
                {product.sellingPriceBob === null
                  ? "Sin precio publicado"
                  : `${formatBob(product.sellingPriceBob)} · vence ${
                      expirationLabel(product.priceExpiresAt) ?? "sin fecha"
                    }`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:max-w-44 sm:flex-col">
              {product.status === "draft" ? (
                <Button
                  size="sm"
                  disabled={workingId === product.id}
                  onClick={() => void publish(product)}
                >
                  {workingId === product.id ? "Publicando…" : "Publicar"}
                </Button>
              ) : null}
              {product.status === "active" ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void share(product)}
                  >
                    Compartir
                  </Button>
                  <a
                    className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-accent"
                    href={productPublicUrl(product.id)}
                  >
                    Ver producto
                  </a>
                </>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      {products.length === 50 ? (
        <p className="mt-4 text-center text-sm text-muted">
          Se muestran los 50 productos más recientes.
        </p>
      ) : null}
    </>
  );
}
