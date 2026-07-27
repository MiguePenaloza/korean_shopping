import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteHeader } from "@/components/layout/site-header";

export function CustomerShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: string;
}) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader />
      {children}
      <MobileNav active={active} />
    </div>
  );
}
