"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MockNotice } from "@/components/ui/mock-notice";
import { formatBob } from "@/lib/money/format";
import { calculatePricingPreview } from "@/lib/money/pricing-preview";

export function PricePreviewForm() {
  const [krw, setKrw] = useState(21000);
  const [profit, setProfit] = useState(42);
  const preview = useMemo(
    () =>
      calculatePricingPreview({
        priceKrw: krw,
        krwPerUsd: 1380,
        bcbBobPerUsd: 6.96,
        bankSpreadBobPerUsd: 0.28,
        contingencyRate: 0.03,
        profitBob: profit,
      }),
    [krw, profit],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-bold">Información del producto</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-soft p-5 text-center">
              <span className="text-3xl">＋</span>
              <strong className="mt-2">Agregar fotografías</strong>
              <span className="mt-1 text-sm text-muted">
                Hasta 3 imágenes · vista simulada
              </span>
              <input className="sr-only" type="file" accept="image/*" multiple />
            </label>
          </div>
          <Input label="Nombre" defaultValue="Relief Sun Rice + Probiotics" />
          <Input label="Marca" defaultValue="Beauty of Joseon" />
          <label className="grid gap-2 text-sm font-semibold">
            Categoría
            <select className="min-h-12 rounded-xl border border-border bg-surface px-4">
              <option>Skincare</option>
              <option>Maquillaje</option>
              <option>K-pop</option>
            </select>
          </label>
          <Input label="Cantidad total" type="number" defaultValue="4" min="0" />
          <Input
            label="Precio en KRW"
            type="number"
            value={krw}
            onChange={(event) => setKrw(Number(event.target.value))}
          />
          <Input
            label="Ganancia fija en BOB"
            type="number"
            value={profit}
            onChange={(event) => setProfit(Number(event.target.value))}
          />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost">Guardar borrador</Button>
          <Button>Publicar producto</Button>
        </div>
      </Card>
      <div>
        <Card className="p-5">
          <p className="text-sm font-bold text-accent">Previsualización automática</p>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between">
              <dt className="text-muted">Costo estimado protegido</dt>
              <dd>{formatBob(preview.protectedCostBob)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Ganancia</dt>
              <dd>{formatBob(profit)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-4 text-xl font-black">
              <dt>Precio final</dt>
              <dd>{formatBob(preview.sellingPriceBob)}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-xl bg-warning-soft p-3 text-xs leading-5 text-warning">
            Simulación con 1 USD = 1.380 KRW, BCB 6,96 + spread 0,28 y 3% de imprevistos.
          </p>
        </Card>
        <MockNotice className="mt-4" />
      </div>
    </div>
  );
}
