import { Suspense } from "react";
import type { Metadata } from "next";

import { CustomerShell } from "@/components/layout/customer-shell";
import { ProductDetail } from "@/components/products/product-detail";

export const metadata: Metadata = { title: "Detalle del producto" };

export default function ProductPage() {
  return (
    <CustomerShell>
      <main className="page-container">
        <Suspense fallback={<p>Cargando producto…</p>}>
          <ProductDetail />
        </Suspense>
      </main>
    </CustomerShell>
  );
}
