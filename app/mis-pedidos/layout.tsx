import { Suspense } from "react";

import { AccountGate } from "@/components/auth/account-gate";

export default function CustomerOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="page-container" role="status">
          <p className="text-muted">Revisando tu cuenta…</p>
        </div>
      }
    >
      <AccountGate>{children}</AccountGate>
    </Suspense>
  );
}
