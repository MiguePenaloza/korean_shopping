"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createExchangeRate,
  getPricingContext,
  previewBulkPrices,
  refreshBulkPrices,
  type BulkPricePreview,
  type PricingContext,
} from "@/lib/admin/products";
import { formatBob } from "@/lib/money/format";

function boliviaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function expirationLabel(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

export function BulkPricing() {
  const [context, setContext] = useState<PricingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rateId, setRateId] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkPricePreview[]>([]);
  const [observedForDate, setObservedForDate] = useState(boliviaDate);
  const [sourceUrl, setSourceUrl] = useState("");
  const [krwPerUsd, setKrwPerUsd] = useState(0);
  const [bcbBobPerUsd, setBcbBobPerUsd] = useState(0);
  const [bankSpread, setBankSpread] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let active = true;
    void getPricingContext()
      .then((value) => {
        if (!active) return;
        setContext(value);
        if (value) {
          setKrwPerUsd(value.krwPerUsd);
          setBcbBobPerUsd(value.bcbBobPerUsd);
          setBankSpread(value.bankSpreadBobPerUsd);
        }
      })
      .catch(() => {
        if (active) setError("No pudimos cargar la tasa vigente.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function showPreview(selectedRateId: string) {
    const rows = await previewBulkPrices(selectedRateId);
    setRateId(selectedRateId);
    setPreview(rows);
    setNotice(
      rows.length
        ? "Vista previa lista. Ningún precio cambió todavía."
        : "No hay productos activos con stock para actualizar.",
    );
  }

  async function saveRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (
      !observedForDate ||
      !sourceUrl.trim() ||
      krwPerUsd <= 0 ||
      bcbBobPerUsd <= 0 ||
      bankSpread < 0
    ) {
      setError("Completa la fecha, la fuente y las tasas con valores válidos.");
      return;
    }
    setWorking(true);
    try {
      const createdRateId = await createExchangeRate({
        observedForDate,
        sourceUrl: sourceUrl.trim(),
        krwPerUsd,
        bcbBobPerUsd,
        bankSpreadBobPerUsd: bankSpread,
        notes: notes.trim(),
      });
      await showPreview(createdRateId);
      setContext(await getPricingContext());
    } catch {
      setError("No pudimos guardar la tasa. Revisa los valores e inténtalo otra vez.");
    } finally {
      setWorking(false);
    }
  }

  async function renewCurrent() {
    if (!context) {
      setError("No existe una tasa vigente para renovar.");
      return;
    }
    setWorking(true);
    setError("");
    setNotice("");
    try {
      await showPreview(context.exchangeRateId);
    } catch {
      setError("No pudimos preparar la renovación con la tasa vigente.");
    } finally {
      setWorking(false);
    }
  }

  async function confirm() {
    if (!rateId) return;
    setWorking(true);
    setError("");
    try {
      const result = await refreshBulkPrices(rateId);
      setNotice(
        `${result.updatedCount} producto${
          result.updatedCount === 1 ? "" : "s"
        } actualizado${result.updatedCount === 1 ? "" : "s"}. Nuevos precios válidos hasta ${expirationLabel(
          result.expiresAt,
        )}.`,
      );
      setPreview([]);
      setRateId(null);
      setContext(await getPricingContext());
    } catch {
      setError(
        "No pudimos actualizar los precios. Ningún cambio parcial fue confirmado.",
      );
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <p className="text-muted" role="status">
        Cargando cotización…
      </p>
    );
  }

  return (
    <form onSubmit={(event) => void saveRate(event)}>
      {context ? (
        <Card className="mb-5 bg-surface-soft p-4">
          <p className="font-bold">Tasa vigente revisada</p>
          <p className="mt-1 text-sm text-muted">
            1 USD = {context.krwPerUsd.toLocaleString("es-BO")} KRW · BCB{" "}
            {context.bcbBobPerUsd.toLocaleString("es-BO")} + spread{" "}
            {context.bankSpreadBobPerUsd.toLocaleString("es-BO")} · imprevistos 3%
          </p>
          <p className="mt-1 text-sm text-muted">
            Próxima expiración propuesta: {expirationLabel(context.nextExpiresAt)}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Fecha de la tasa BCB"
          type="date"
          value={observedForDate}
          onChange={(event) => setObservedForDate(event.target.value)}
          required
        />
        <Input
          label="Fuente oficial"
          type="url"
          placeholder="https://www.bcb.gob.bo/…"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          required
        />
        <Input
          label="KRW por USD"
          type="number"
          min="1"
          step="0.000001"
          inputMode="decimal"
          value={krwPerUsd || ""}
          onChange={(event) => setKrwPerUsd(Number(event.target.value))}
          required
        />
        <Input
          label="BCB BOB por USD"
          type="number"
          min="0.000001"
          step="0.000001"
          inputMode="decimal"
          value={bcbBobPerUsd || ""}
          onChange={(event) => setBcbBobPerUsd(Number(event.target.value))}
          required
        />
        <Input
          label="Spread bancario"
          type="number"
          min="0"
          step="0.000001"
          inputMode="decimal"
          value={bankSpread || ""}
          onChange={(event) => setBankSpread(Number(event.target.value))}
          required
        />
        <Input
          label="Observaciones (opcional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ej. Cotización publicada a las 20:00"
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="submit" disabled={working}>
          {working ? "Procesando…" : "Guardar tasa y previsualizar"}
        </Button>
        <Button
          variant="secondary"
          disabled={working || !context}
          onClick={() => void renewCurrent()}
        >
          Renovar con tasa del viernes
        </Button>
      </div>

      {error ? (
        <p
          className="mt-5 rounded-xl bg-warning-soft p-4 text-sm text-warning"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-5 rounded-xl bg-surface-soft p-4 text-sm" role="status">
          {notice}
        </p>
      ) : null}

      {rateId ? (
        <Card className="mt-6 overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 className="text-xl font-bold">
              Vista previa de {preview.length} producto
              {preview.length === 1 ? "" : "s"} con stock
            </h2>
            {context ? (
              <p className="mt-1 text-sm text-muted">
                Nueva expiración: {expirationLabel(context.nextExpiresAt)}
              </p>
            ) : null}
          </div>
          <div className="max-h-[32rem] divide-y divide-border overflow-auto">
            {preview.map((product) => (
              <div
                key={product.productId}
                className="grid grid-cols-[1fr_auto] gap-4 p-4 text-sm"
              >
                <div>
                  <strong>{product.name}</strong>
                  <p className="text-muted">{product.code}</p>
                </div>
                <div className="text-right">
                  {product.currentPriceBob !== null ? (
                    <span className="text-muted line-through">
                      {formatBob(product.currentPriceBob)}
                    </span>
                  ) : null}
                  <strong className="ml-3">{formatBob(product.newPriceBob)}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 bg-surface-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold">
              Confirma solo después de revisar todos los precios.
            </p>
            <Button disabled={working || !preview.length} onClick={() => void confirm()}>
              Actualizar precios disponibles
            </Button>
          </div>
        </Card>
      ) : null}
    </form>
  );
}
