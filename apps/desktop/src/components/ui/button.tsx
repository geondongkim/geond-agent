import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/cn.js";

const buttonVariants = {
  solid:
    "bg-[color:var(--accent-strong)] text-[color:var(--accent-ink)] shadow-[0_14px_30px_rgba(0,0,0,0.22)] hover:bg-[color:var(--accent)]",
  ghost:
    "bg-transparent text-[color:var(--ink-muted)] hover:bg-[color:var(--panel-muted)] hover:text-[color:var(--ink)]",
  outline:
    "border border-[color:var(--border-strong)] bg-[color:var(--panel)] text-[color:var(--ink)] hover:border-white/25"
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: keyof typeof buttonVariants;
}

export function Button({ className, type = "button", variant = "solid", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  );
}
