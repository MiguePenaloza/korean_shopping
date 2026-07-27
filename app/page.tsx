import Link from "next/link";

import { CustomerShell } from "@/components/layout/customer-shell";
import { ProductCard } from "@/components/products/product-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mockProducts } from "@/lib/mock-data/products";

export default function Home() {
  return (
    <CustomerShell active="/">
      <main className="page-container">
        <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden bg-[linear-gradient(145deg,#fff_18%,#f8e9ec_100%)] p-6 sm:p-9">
            <Badge variant="accent">Compras temporales desde Corea</Badge>
            <h1 className="mt-5 max-w-2xl text-4xl leading-[1.08] font-black tracking-[-0.045em] sm:text-5xl">
              Tus favoritos coreanos, elegidos en persona.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Reserva productos disponibles durante el viaje. Verás con claridad el
              precio, su vigencia y el estado de tu pedido.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/buscar">Explorar productos</ButtonLink>
              <ButtonLink href="/pedido" variant="secondary">
                ¿Cómo funciona?
              </ButtonLink>
            </div>
          </Card>
          <Card className="flex flex-col justify-between bg-foreground p-6 text-white sm:p-7">
            <div>
              <p className="text-sm font-semibold text-white/65">Compra coordinada</p>
              <h2 className="mt-2 text-2xl font-bold">Paga por QR antes de la compra</h2>
              <p className="mt-3 leading-6 text-white/75">
                Confirma tu pedido, solicita el QR por WhatsApp y avisa cuando hayas
                pagado.
              </p>
            </div>
            <p className="mt-8 rounded-2xl bg-white/10 p-4 text-sm leading-6">
              Los precios vencen a las 08:15 en Bolivia y se reactivan después de la
              actualización administrativa.
            </p>
          </Card>
        </section>

        <section className="mt-10" aria-labelledby="catalog-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-accent">Selección del viaje</p>
              <h2 id="catalog-title" className="mt-1 text-2xl font-bold tracking-tight">
                Recién publicados
              </h2>
            </div>
            <Link
              href="/buscar"
              className="text-sm font-bold text-accent hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <Alert className="mt-5" title="Cada precio tiene vigencia limitada">
            Antes de confirmar, revisa la hora y el estado visibles en cada producto.
          </Alert>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockProducts.slice(0, 3).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>
    </CustomerShell>
  );
}
