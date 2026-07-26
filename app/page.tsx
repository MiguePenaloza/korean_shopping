import { MobileNav } from "@/components/layout/mobile-nav";
import { ProductCard } from "@/components/products/product-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { mockProducts } from "@/lib/mock-data/products";

export default function Home() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              Korean Shopping
            </p>
            <p className="text-xl font-bold tracking-tight">Belle Perle</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Mi cuenta estará disponible en una fase posterior"
            disabled
          >
            Mi cuenta
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden bg-[linear-gradient(145deg,#fff_18%,#f8e9ec_100%)] p-6 sm:p-9">
            <Badge variant="accent">Viaje temporal a Corea</Badge>
            <h1 className="mt-5 max-w-2xl text-4xl leading-[1.08] font-bold tracking-[-0.04em] sm:text-5xl">
              Belleza coreana y K-pop, elegidos directamente en Corea.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Publicaremos productos disponibles durante el viaje. Cada precio tendrá una
              hora de vigencia clara antes de confirmar el pedido.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="#catalog-title"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong"
              >
                Ver productos
              </a>
              <Button variant="secondary" disabled>
                Cómo funciona
              </Button>
            </div>
          </Card>

          <Card className="flex flex-col justify-between bg-foreground p-6 text-white sm:p-7">
            <div>
              <p className="text-sm font-semibold text-white/65">Compra protegida</p>
              <h2 className="mt-2 text-2xl font-bold">Pago completo antes de comprar</h2>
              <p className="mt-3 leading-6 text-white/75">
                Después de confirmar el pedido, coordinaremos el QR por WhatsApp.
              </p>
            </div>
            <p className="mt-8 rounded-2xl bg-white/10 p-4 text-sm leading-6">
              La compra en Corea se realiza únicamente después de verificar el pago.
            </p>
          </Card>
        </section>

        <section className="mt-8" aria-labelledby="catalog-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-accent">Selección temporal</p>
              <h2 id="catalog-title" className="mt-1 text-2xl font-bold tracking-tight">
                Productos de ejemplo
              </h2>
            </div>
            <div className="w-full sm:max-w-sm">
              <Input
                label="Buscar productos"
                placeholder="Nombre, marca o código"
                type="search"
              />
            </div>
          </div>

          <Alert className="mt-5" title="Los precios tienen vigencia limitada">
            La base de datos validará precio, disponibilidad y vencimiento al confirmar
            cada pedido.
          </Alert>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>

      <MobileNav />
    </div>
  );
}
