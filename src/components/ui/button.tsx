import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "solid";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary: "cyber-btn",
  ghost:
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
  danger: "cyber-btn cyber-btn-danger",
  solid: "cyber-btn cyber-btn-solid",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1 text-xs",
  md: "px-5 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = variantClasses[variant];
  // cyber-btn variants carry their own padding; ghost needs size here
  const sizing =
    variant === "ghost" ? sizeClasses[size] : size === "sm" ? "px-3 py-1 text-xs" : "";

  return (
    <button className={clsx(base, sizing, className)} {...props}>
      {children}
    </button>
  );
}
