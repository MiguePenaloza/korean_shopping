"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ProductCard } from "@/components/products/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCataloguePage, type CataloguePage } from "@/lib/catalogue/catalogue";

export function FeaturedCatalogue() {
  const { configured } = useAuth();
  const [result, setResult] = useState<CataloguePage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!configured) return;
    let active = true;

    void getCataloguePage({ page: 1, pageSize: 3 })
      .then((catalogue) => {
        if (active) setResult(catalogue);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [configured]);

  if (!configured || failed) {
    return (
      <EmptyState
        title="Catálogo temporalmente no disponible"
        description="Puedes volver a intentarlo desde la sección Buscar."
      />
    );
  }

  if (!result) {
    return (
      <p className="text-sm text-muted" role="status">
        Cargando productos…
      </p>
    );
  }

  if (!result.products.length) {
    return (
      <EmptyState
        title="Todavía no hay productos publicados"
        description="Vuelve pronto para ver la selección disponible."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {result.products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
