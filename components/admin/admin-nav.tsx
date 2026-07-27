import Link from "next/link";

const links = [
  ["/admin", "Resumen"],
  ["/admin/productos", "Productos"],
  ["/admin/pedidos", "Pedidos"],
  ["/admin/configuracion", "Configuración"],
] as const;

export function AdminNav() {
  return (
    <aside className="border-b border-border bg-foreground text-white lg:min-h-screen lg:w-64 lg:border-r lg:border-b-0">
      <div className="mx-auto max-w-6xl p-4 lg:p-6">
        <Link href="/admin">
          <span className="text-xs font-bold tracking-[0.18em] text-white/60 uppercase">
            Belle Perle
          </span>
          <span className="block text-xl font-black">Administración</span>
        </Link>
        <nav
          className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:flex-col"
          aria-label="Administración"
        >
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 rounded-xl px-4 py-3 text-sm font-bold text-white/75 hover:bg-white/10 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/"
          className="mt-5 hidden text-sm font-bold text-white/60 hover:text-white lg:block"
        >
          ← Ver tienda
        </Link>
      </div>
    </aside>
  );
}
