import { PricePreviewForm } from "@/components/admin/price-preview-form";

export default function NewProductPage() {
  return (
    <main className="page-container">
      <p className="text-sm font-bold text-accent">Productos</p>
      <h1 className="mt-1 text-3xl font-black">Crear producto</h1>
      <p className="mt-2 mb-6 text-muted">
        Formulario rápido para publicar mientras visitas una tienda.
      </p>
      <PricePreviewForm />
    </main>
  );
}
