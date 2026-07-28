"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MockNotice } from "@/components/ui/mock-notice";
import { mockProducts } from "@/lib/mock-data/products";
import { formatBob } from "@/lib/money/format";

export function BulkPricing() {
  const [preview, setPreview] = useState(false);
  const [updated, setUpdated] = useState(false);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="KRW por USD" defaultValue="1380" inputMode="decimal" />
        <Input label="BCB BOB por USD" defaultValue="6.96" inputMode="decimal" />
        <Input label="Spread bancario" defaultValue="0.28" inputMode="decimal" />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={() => setPreview(true)}>Previsualizar cambios</Button>
        <Button variant="secondary" onClick={() => setPreview(true)}>
          Renovar con tasa del viernes
        </Button>
      </div>
      {preview && (
        <Card className="mt-6 overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 className="text-xl font-bold">Vista previa de 3 productos con stock</h2>
            <p className="mt-1 text-sm text-muted">
              Nueva expiración propuesta: 27 julio, 08:15
            </p>
          </div>
          <div className="divide-y divide-border">
            {mockProducts
              .filter((product) => product.availability !== "sold_out")
              .slice(0, 3)
              .map((product, index) => {
                const currentPrice = product.priceBob ?? 0;
                return (
                  <div
                    key={product.id}
                    className="grid grid-cols-[1fr_auto] gap-4 p-4 text-sm"
                  >
                    <div>
                      <strong>{product.name}</strong>
                      <p className="text-muted">{product.code}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-muted line-through">
                        {formatBob(currentPrice)}
                      </span>
                      <strong className="ml-3">
                        {formatBob(currentPrice + 3 + index * 2)}
                      </strong>
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex flex-col gap-3 bg-surface-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold">
              {updated
                ? "Actualización simulada completada."
                : "Ningún precio cambiará hasta confirmar."}
            </p>
            <Button onClick={() => setUpdated(true)}>
              Actualizar precios disponibles
            </Button>
          </div>
        </Card>
      )}
      <MockNotice className="mt-5" />
    </>
  );
}
