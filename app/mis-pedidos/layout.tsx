import { AccountGate } from "@/components/auth/account-gate";

export default function CustomerOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountGate>{children}</AccountGate>;
}
