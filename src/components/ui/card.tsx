import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={clsx(hover ? "cyber-card-hover" : "cyber-card", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("px-5 py-4 border-b border-[var(--border-color)]", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={clsx("text-sm font-semibold text-[var(--text-primary)] tracking-wide", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx("text-xs text-[var(--text-secondary)] mt-0.5", className)}>
      {children}
    </p>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}
