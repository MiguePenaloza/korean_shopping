"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBob } from "@/lib/money/format";
import {
  customerOrderPresentation,
  listCustomerOrders,
  type CustomerOrderSummary,
} from "@/lib/orders/tracking";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CustomerOrderList() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async (requestedPage: number) => {
    setStatus("loading");
    try {
      setOrders(await listCustomerOrders(requestedPage));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void listCustomerOrders(page)
      .then((rows) => {
        if (!active) return;
        setOrders(rows);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [page]);

  const totalCount = orders[0]?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  function changePage(nextPage: number) {
    setStatus("loading");
    setPage(nextPage);
  }

  return (
    <main className="page-container">
      <p className="text-sm font-bold text-accent">
        {profile?.fullName ? `Hola, ${profile.fullName}` : "Tu cuenta"}
      </p>
      <h1 className="mt-1 text-3xl font-black">Mis pedidos</h1>
      <p className="mt-2 max-w-2xl leading-6 text-muted">
        Aquí aparecen únicamente los pedidos que hiciste mientras estabas dentro de esta
        cuenta.
      </p>

      {status === "loading" ? (
        <p className="mt-6 text-muted" role="status">
          Cargando tus pedidos…
        </p>
      ) : null}

      {status === "error" ? (
        <div className="mt-6">
          <EmptyState
            title="No pudimos cargar tus pedidos"
            description="Revisa tu conexión y vuelve a intentarlo."
            action={<Button onClick={() => void load(page)}>Reintentar</Button>}
          />
        </div>
      ) : null}

      {status === "ready" && orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Todavía no tienes pedidos en esta cuenta"
            description="Los pedidos hechos como invitado no se agregan por número de teléfono. Tus próximos pedidos con la cuenta aparecerán aquí."
            action={<ButtonLink href="/buscar">Ver productos</ButtonLink>}
          />
        </div>
      ) : null}

      {status === "ready" && orders.length > 0 ? (
        <>
          <div className="mt-6 space-y-4">
            {orders.map((order) => {
              const presentation = customerOrderPresentation(order);
              return (
                <Link
                  key={order.number}
                  href={`/mis-pedidos/detalle?numero=${encodeURIComponent(order.number)}`}
                  className="block"
                >
                  <Card className="p-5 transition-transform hover:-translate-y-0.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted">
                          {formatDate(order.createdAt)}
                        </p>
                        <h2 className="mt-1 text-lg font-bold">{order.number}</h2>
                      </div>
                      <Badge variant={presentation.variant}>{presentation.label}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      {presentation.description}
                    </p>
                    <div className="mt-4 flex justify-between border-t border-border pt-4">
                      <span className="text-sm text-muted">
                        {order.itemQuantity} unidad
                        {order.itemQuantity === 1 ? "" : "es"}
                      </span>
                      <strong>{formatBob(order.totalBob)}</strong>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <nav
              className="mt-6 flex items-center justify-between gap-4"
              aria-label="Páginas de pedidos"
            >
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => changePage(Math.max(1, page - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm font-bold">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => changePage(Math.min(totalPages, page + 1))}
              >
                Siguiente
              </Button>
            </nav>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
