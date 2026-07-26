import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <Card className="px-6 py-10 text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
