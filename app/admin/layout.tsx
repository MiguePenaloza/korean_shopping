import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <AdminNav />
      <div className="min-w-0 flex-1 bg-background">{children}</div>
    </div>
  );
}
