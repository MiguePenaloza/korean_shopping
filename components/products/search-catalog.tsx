"use client";

import { useMemo, useState } from "react";

import { ProductCard } from "@/components/products/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { mockProducts } from "@/lib/mock-data/products";

const categories = ["Todos", "Skincare", "Maquillaje", "K-pop", "Merch"] as const;

export function SearchCatalog() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("Todos");
  const products = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return mockProducts.filter((product) => {
      const matchesCategory = category === "Todos" || product.category === category;
      const matchesQuery =
        normalized.length === 0 ||
        `${product.name} ${product.brand} ${product.code}`
          .toLocaleLowerCase("es")
          .includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <>
      <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[1fr_auto]">
        <Input
          label="Buscar por nombre, marca o código"
          placeholder="Ej.: protector, rom&nd o BP-001"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Categoría</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`min-h-11 rounded-xl px-4 text-sm font-bold ${
                  category === item
                    ? "bg-foreground text-white"
                    : "border border-border bg-surface text-muted"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <p className="mt-5 text-sm text-muted" aria-live="polite">
        {products.length} productos encontrados
      </p>
      {products.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="No encontramos coincidencias"
            description="Prueba con otra palabra o elige Todas las categorías."
          />
        </div>
      )}
    </>
  );
}
