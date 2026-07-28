"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createAdminProduct,
  getAdminCategories,
  getPricingContext,
  productPublicUrl,
  shareProduct,
  uploadProductImages,
  type AdminCategory,
  type PricingContext,
} from "@/lib/admin/products";
import {
  processProductImages,
  validateProductImageFiles,
} from "@/lib/images/product-images";
import { formatBob } from "@/lib/money/format";
import { calculatePricingPreview } from "@/lib/money/pricing-preview";

const lastCategoryKey = "belle-perle:last-product-category";

type Result = {
  id: string;
  code: string;
  price: number | null;
  expiresAt: string | null;
  status: "draft" | "active";
};

function friendlyError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "TOO_MANY_IMAGES") return "Puedes seleccionar hasta 3 fotografías.";
  if (code === "INVALID_IMAGE_TYPE") return "Usa imágenes JPEG, PNG o WebP.";
  if (code === "IMAGE_INPUT_TOO_LARGE") {
    return "Una fotografía supera los 20 MB. Elige una imagen más liviana.";
  }
  if (code === "IMAGE_DIMENSIONS_TOO_LARGE") {
    return "Una fotografía tiene dimensiones demasiado grandes.";
  }
  if (code === "SUPABASE_NOT_CONFIGURED") {
    return "La conexión con Supabase todavía no está configurada.";
  }
  if (code === "PRODUCT_IMAGE_UPLOAD_FAILED") {
    return "No pudimos subir las fotografías. Revisa tu conexión e inténtalo otra vez.";
  }
  return "No pudimos guardar el producto. Revisa los datos e inténtalo otra vez.";
}

function formatExpiration(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PricePreviewForm() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [context, setContext] = useState<PricingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [variant, setVariant] = useState("");
  const [krw, setKrw] = useState(0);
  const [stock, setStock] = useState(1);
  const [profit, setProfit] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([getAdminCategories(), getPricingContext()])
      .then(([categoryRows, pricing]) => {
        if (!active) return;
        setCategories(categoryRows);
        setContext(pricing);
        const remembered = window.localStorage.getItem(lastCategoryKey);
        const initial =
          categoryRows.find((category) => category.id === remembered)?.id ??
          categoryRows[0]?.id ??
          "";
        setCategoryId(initial);
      })
      .catch(() => {
        if (active) setError("No pudimos cargar la configuración del producto.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    },
    [previews],
  );

  const preview = useMemo(() => {
    if (!context || krw <= 0 || profit < 0) return null;
    return calculatePricingPreview({
      priceKrw: krw,
      krwPerUsd: context.krwPerUsd,
      bcbBobPerUsd: context.bcbBobPerUsd,
      bankSpreadBobPerUsd: context.bankSpreadBobPerUsd,
      contingencyRate: context.contingencyRate,
      profitBob: profit,
    });
  }, [context, krw, profit]);

  function selectFiles(selected: File[]) {
    setError("");
    try {
      validateProductImageFiles(selected);
      previews.forEach((url) => URL.revokeObjectURL(url));
      setFiles(selected);
      setPreviews(selected.map((file) => URL.createObjectURL(file)));
    } catch (selectionError) {
      setError(friendlyError(selectionError));
    }
  }

  async function submit(status: "draft" | "active") {
    setError("");
    setResult(null);

    if (
      !name.trim() ||
      !brand.trim() ||
      !categoryId ||
      krw <= 0 ||
      stock < 0 ||
      profit < 0
    ) {
      setError("Completa los campos obligatorios con valores válidos.");
      return;
    }
    if (status === "active" && !context) {
      setError("Primero registra una tasa vigente en Configuración de precios.");
      return;
    }

    setSaving(true);
    const productId = crypto.randomUUID();
    try {
      const processed = await processProductImages(files, productId, name.trim());
      const uploadedPaths = await uploadProductImages(processed);
      const created = await createAdminProduct({
        productId,
        name: name.trim(),
        brand: brand.trim(),
        categoryId,
        description: description.trim(),
        variant: variant.trim(),
        priceKrw: krw,
        totalStock: stock,
        marginBob: profit,
        status,
        images: processed.map((image) => image.metadata),
        uploadedPaths,
      });
      window.localStorage.setItem(lastCategoryKey, categoryId);
      setResult({
        id: created.id,
        code: created.code,
        price: created.sellingPriceBob,
        expiresAt: created.expiresAt,
        status,
      });
    } catch (submitError) {
      setError(friendlyError(submitError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-muted" role="status">
        Cargando formulario…
      </p>
    );
  }

  return (
    <form
      className="grid gap-6 xl:grid-cols-[1fr_22rem]"
      onSubmit={(event) => {
        event.preventDefault();
        void submit("active");
      }}
    >
      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-bold">Información del producto</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-soft p-5 text-center">
              <span className="text-3xl" aria-hidden="true">
                ＋
              </span>
              <strong className="mt-2">Agregar fotografías</strong>
              <span className="mt-1 text-sm text-muted">
                Hasta 3 imágenes JPEG, PNG o WebP
              </span>
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                multiple
                onChange={(event) => {
                  selectFiles([...files, ...Array.from(event.target.files ?? [])]);
                  event.target.value = "";
                }}
              />
            </label>
            {previews.length ? (
              <div
                className="mt-3 grid grid-cols-3 gap-3"
                aria-label="Fotografías seleccionadas"
              >
                {previews.map((url, index) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Vista previa ${index + 1}`}
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 min-h-11 min-w-11 rounded-full bg-white/95 text-lg font-bold shadow"
                      aria-label={`Quitar fotografía ${index + 1}`}
                      onClick={() =>
                        selectFiles(files.filter((_, fileIndex) => fileIndex !== index))
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <Input
            label="Nombre"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            label="Marca"
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            required
          />
          <label className="grid gap-2 text-sm font-semibold">
            Categoría
            <select
              className="min-h-12 rounded-xl border border-border bg-surface px-4"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Cantidad total"
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(event) => setStock(Number(event.target.value))}
            required
          />
          <Input
            label="Precio en KRW"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={krw || ""}
            onChange={(event) => setKrw(Number(event.target.value))}
            required
          />
          <Input
            label="Ganancia fija en BOB"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={profit || ""}
            onChange={(event) => setProfit(Number(event.target.value))}
            required
          />
          <Input
            label="Variante (opcional)"
            value={variant}
            onChange={(event) => setVariant(event.target.value)}
            placeholder="Ej. 50 ml"
          />
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            Descripción (opcional)
            <textarea
              className="min-h-28 rounded-xl border border-border bg-surface px-4 py-3 font-normal"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </div>

        {error ? (
          <p
            className="mt-5 rounded-xl bg-warning-soft p-4 text-sm text-warning"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {result ? (
          <div className="mt-5 rounded-xl bg-success-soft p-4" role="status">
            <p className="font-bold">
              {result.status === "active" ? "Producto publicado" : "Borrador guardado"} ·{" "}
              {result.code}
            </p>
            {result.price !== null ? (
              <p className="mt-1 text-sm">
                Precio confirmado: {formatBob(result.price)}
                {formatExpiration(result.expiresAt)
                  ? ` · vence ${formatExpiration(result.expiresAt)}`
                  : ""}
              </p>
            ) : null}
            {result.status === "active" ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  size="sm"
                  onClick={() =>
                    void shareProduct({ id: result.id, name }).catch(() => {
                      setError("No pudimos compartir el enlace en este dispositivo.");
                    })
                  }
                >
                  Compartir producto
                </Button>
                <a
                  className="inline-flex min-h-11 items-center font-semibold text-accent"
                  href={productPublicUrl(result.id)}
                >
                  Ver producto
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" disabled={saving} onClick={() => void submit("draft")}>
            {saving ? "Guardando…" : "Guardar borrador"}
          </Button>
          <Button type="submit" disabled={saving || !context}>
            {saving ? "Publicando…" : "Publicar producto"}
          </Button>
        </div>
      </Card>

      <div>
        <Card className="p-5">
          <p className="text-sm font-bold text-accent">Previsualización automática</p>
          {preview ? (
            <dl className="mt-4 space-y-3">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Costo estimado protegido</dt>
                <dd>{formatBob(preview.protectedCostBob)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Ganancia</dt>
                <dd>{formatBob(profit)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-4 text-xl font-black">
                <dt>Precio final</dt>
                <dd>{formatBob(preview.sellingPriceBob)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Ingresa el precio en KRW para ver la conversión.
            </p>
          )}
          {context ? (
            <p className="mt-4 rounded-xl bg-warning-soft p-3 text-xs leading-5 text-warning">
              Referencia: 1 USD = {context.krwPerUsd.toLocaleString("es-BO")} KRW, BCB{" "}
              {context.bcbBobPerUsd.toLocaleString("es-BO")} + spread{" "}
              {context.bankSpreadBobPerUsd.toLocaleString("es-BO")} y 3% de imprevistos.
              El precio definitivo se calcula al guardar.
            </p>
          ) : (
            <p className="mt-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">
              No hay una tasa vigente. Puedes guardar un borrador y registrar la tasa
              desde Configuración de precios.
            </p>
          )}
        </Card>
      </div>
    </form>
  );
}
