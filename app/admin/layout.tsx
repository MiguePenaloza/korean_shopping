import type { Metadata } from "next";

import { AdminNav } from "@/components/admin/admin-nav";
import { AdminGate } from "@/components/auth/admin-gate";

export const metadata: Metadata = {
  title: {
    default: "Administración",
    template: "%s | Administración | Belle Perle",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div className="min-h-screen lg:flex">
        <AdminNav />
        <div id="main-content" className="min-w-0 flex-1 bg-background" tabIndex={-1}>
          {children}
        </div>
      </div>
    </AdminGate>
  );
}
