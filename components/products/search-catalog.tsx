"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ProductCard } from "@/components/products/product-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  getCataloguePage,
  getPublicCategories,
  type CataloguePage,
  type PublicCategory,
} from "@/lib/catalogue/catalogue";

type CatalogueState = {
  key: string;
  status: "loading" | "ready" | "error";
  result: CataloguePage | null;
};

const pageSize = 20;

export function SearchCatalog() {
  const { configured } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const key = `${debouncedQuery}|${categorySlug ?? ""}|${page}|${retry}`;
  const [state, setState] = useState<CatalogueState>({
    key: "",
    status: "loading",
    result: null,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!configured) return;
    let active = true;

    void getPublicCategories()
      .then((result) => {
        if (active) setCategories(result);
      })
      .catch(() => {
        if (active) setCategories([]);
      });

    return () => {
      active = false;
    };
  }, [configured]);

  useEffect(() => {
    if (!configured) return;
    let active = true;

    void getCataloguePage({
      query: debouncedQuery,
      categorySlug,
      page,
      pageSize,
    })
      .then((result) => {
        if (active) setState({ key, status: "ready", result });
      })
      .catch(() => {
        if (active) setState({ key, status: "error", result: null });
      });

    return () => {
      active = false;
    };
  }, [categorySlug, configured, debouncedQuery, key, page]);

  const loading = configured && (state.key !== key || state.status === "loading");
  const result = state.key === key ? state.result : null;
  const pageCount = result ? Math.max(1, Math.ceil(result.totalCount / pageSize)) : 1;

  function selectCategory(slug: string | null) {
    setCategorySlug(slug);
    setPage(1);
  }

  if (!configured) {
    return (
      <div className="mt-6">
        <EmptyState
          title="Catálogo no conectado"
          description="Configura la conexión pública de Supabase para consultar los productos."
        />
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[1fr_auto]">
        <Input
          label="Buscar por nombre, marca o código"
          placeholder="Ej.: protector, rom&nd o BP-001"
          type="search"
          value={query}
          maxLength={120}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Categoría</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectCategory(null)}
              aria-pressed={categorySlug === null}
              className={`min-h-11 rounded-xl px-4 text-sm font-bold ${
                categorySlug === null
                  ? "bg-foreground text-white"
                  : "border border-border bg-surface text-muted"
              }`}
            >
              Todas
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => selectCategory(category.slug)}
                aria-pressed={categorySlug === category.slug}
                className={`min-h-11 rounded-xl px-4 text-sm font-bold ${
                  categorySlug === category.slug
                    ? "bg-foreground text-white"
                    : "border border-border bg-surface text-muted"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-muted" role="status">
          Buscando productos…
        </p>
      ) : null}

      {!loading && state.key === key && state.status === "error" ? (
        <div className="mt-5">
          <EmptyState
            title="No pudimos cargar el catálogo"
            description="Revisa tu conexión e inténtalo nuevamente."
            action={
              <Button onClick={() => setRetry((value) => value + 1)}>Reintentar</Button>
            }
          />
        </div>
      ) : null}

      {!loading && result ? (
        <>
          <p className="mt-5 text-sm text-muted" aria-live="polite">
            {result.totalCount}{" "}
            {result.totalCount === 1 ? "producto encontrado" : "productos encontrados"}
          </p>
          {result.products.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.products.map((product) => (
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

          {pageCount > 1 ? (
            <nav
              className="mt-8 flex items-center justify-center gap-3"
              aria-label="Páginas del catálogo"
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm font-semibold" aria-live="polite">
                Página {page} de {pageCount}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                Siguiente
              </Button>
            </nav>
          ) : null}
        </>
      ) : null}
    </>
  );
}
