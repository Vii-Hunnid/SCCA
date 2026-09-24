import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-lg",
        "bg-[color-mix(in_srgb,var(--bg-tertiary)_70%,transparent)]",
        className
      )}
    />
  );
}
