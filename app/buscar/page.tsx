import type { Metadata } from "next";

import { CustomerShell } from "@/components/layout/customer-shell";
import { SearchCatalog } from "@/components/products/search-catalog";

export const metadata: Metadata = { title: "Buscar productos" };

export default function SearchPage() {
  return (
    <CustomerShell active="/buscar">
      <main className="page-container">
        <p className="text-sm font-bold text-accent">Catálogo</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Encuentra tu favorito</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Los productos disponibles aparecen primero. Los precios vencidos continúan
          visibles, pero no se pueden agregar.
        </p>
        <SearchCatalog />
      </main>
    </CustomerShell>
  );
}
