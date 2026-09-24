import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{
          backgroundColor: "color-mix(in srgb, var(--neon-cyan) 8%, transparent)",
          border: "1px solid var(--border-color)",
        }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--neon-cyan)" }} />
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
