import { AdminNav } from "@/components/admin/admin-nav";
import { AdminGate } from "@/components/auth/admin-gate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div className="min-h-screen lg:flex">
        <AdminNav />
        <div className="min-w-0 flex-1 bg-background">{children}</div>
      </div>
    </AdminGate>
  );
}
