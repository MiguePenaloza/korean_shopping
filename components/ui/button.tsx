import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white shadow-sm hover:bg-accent-strong disabled:bg-disabled",
  secondary:
    "border border-border bg-surface text-foreground hover:border-accent/35 hover:bg-accent-soft",
  ghost: "bg-transparent text-foreground hover:bg-surface-soft",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-5 text-base",
};

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  );
}

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({
  href,
  children,
  className = "",
  variant = "primary",
  size = "md",
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </Link>
  );
}
