"use client";

import { useId, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ className = "", hint, id, label, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={hintId}
        className={`min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted/70 hover:border-accent/40 focus:border-accent focus:outline-none ${className}`}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="mt-2 text-sm leading-5 text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
