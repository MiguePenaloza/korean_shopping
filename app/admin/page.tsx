import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = { title: "Resumen" };

export default function AdminDashboardPage() {
  return (
    <main className="page-container">
      <AdminDashboard />
    </main>
  );
}
