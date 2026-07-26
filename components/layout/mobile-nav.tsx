const navItems = [
  { href: "#catalog-title", label: "Inicio" },
  { href: "#catalog-title", label: "Buscar" },
  { href: "#", label: "Pedido" },
  { href: "#", label: "Mi cuenta" },
] as const;

export function MobileNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {navItems.map((item, index) => (
          <li key={item.label}>
            <a
              href={item.href}
              aria-current={index === 0 ? "page" : undefined}
              className={`flex min-h-16 items-center justify-center px-1 text-center text-xs font-semibold ${
                index === 0 ? "text-accent" : "text-muted"
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
