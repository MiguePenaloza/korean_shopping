import { AdminProductList } from "@/components/admin/admin-product-list";
import { ButtonLink } from "@/components/ui/button";

export default function AdminProductsPage() {
  return (
    <main className="page-container">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-accent">Inventario</p>
          <h1 className="mt-1 text-3xl font-black">Productos</h1>
        </div>
        <ButtonLink href="/admin/productos/nuevo">Crear producto</ButtonLink>
      </div>
      <AdminProductList />
    </main>
  );
}
