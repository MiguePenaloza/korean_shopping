import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border border-border bg-surface shadow-[0_14px_45px_rgba(76,48,57,0.06)] ${className}`}
      {...props}
    />
  );
}
