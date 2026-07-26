import type { HTMLAttributes, ReactNode } from "react";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  children: ReactNode;
};

export function Alert({ children, className = "", title, ...props }: AlertProps) {
  return (
    <div
      role="note"
      className={`rounded-2xl border border-warning/20 bg-warning-soft p-4 ${className}`}
      {...props}
    >
      <p className="font-bold text-warning">{title}</p>
      <div className="mt-1 text-sm leading-6 text-foreground/75">{children}</div>
    </div>
  );
}
