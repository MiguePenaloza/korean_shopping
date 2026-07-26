import type { HTMLAttributes } from "react";

type BadgeVariant = "accent" | "success" | "warning" | "neutral";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const styles: Record<BadgeVariant, string> = {
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-surface-soft text-muted",
};

export function Badge({ className = "", variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-bold ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
