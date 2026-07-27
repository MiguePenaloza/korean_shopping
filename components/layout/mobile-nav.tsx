import Link from "next/link";

const navItems = [
  { href: "/", label: "Inicio", icon: "⌂" },
  { href: "/buscar", label: "Buscar", icon: "⌕" },
  { href: "/carrito", label: "Carrito", icon: "2" },
  { href: "/mis-pedidos", label: "Pedidos", icon: "✓" },
] as const;

export function MobileNav({ active = "" }: { active?: string }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {navItems.map((item) => {
          const isActive = active === item.href;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-center text-xs font-semibold ${
                  isActive ? "text-accent" : "text-muted"
                }`}
              >
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-soft px-1 text-xs">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
