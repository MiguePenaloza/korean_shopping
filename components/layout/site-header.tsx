"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import { ButtonLink } from "@/components/ui/button";

export function SiteHeader() {
  const { isAdmin, isAnonymous, loading, user } = useAuth();
  const hasAccount = Boolean(user && !isAnonymous);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Belle Perle, inicio">
          <span className="block text-[10px] font-bold tracking-[0.2em] text-accent uppercase">
            Korean Shopping
          </span>
          <span className="block text-lg font-black tracking-tight">Belle Perle</span>
        </Link>
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Navegación principal"
        >
          <Link className="nav-link" href="/">
            Inicio
          </Link>
          <Link className="nav-link" href="/buscar">
            Buscar
          </Link>
          <Link className="nav-link" href="/pedido">
            Mi pedido
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <ButtonLink
              href="/admin"
              size="sm"
              variant="ghost"
              className="hidden sm:flex"
            >
              Administrar
            </ButtonLink>
          ) : null}
          <ButtonLink
            href="/carrito"
            size="sm"
            variant="ghost"
            className="hidden sm:flex"
          >
            Carrito · 2
          </ButtonLink>
          <ButtonLink
            href={hasAccount ? "/mi-cuenta" : "/ingresar"}
            size="sm"
            variant="secondary"
          >
            {loading ? "Cuenta" : hasAccount ? "Mi cuenta" : "Ingresar"}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
