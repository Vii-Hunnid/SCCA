import { clsx } from "clsx";
import type { ReactNode } from "react";

type Tone = "cyan" | "green" | "red" | "yellow" | "purple" | "neutral";

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={clsx(`badge-${tone}`, className)}>{children}</span>;
}
