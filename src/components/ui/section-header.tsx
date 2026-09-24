import type { LucideIcon } from "lucide-react";

export function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      {Icon && (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: "color-mix(in srgb, var(--neon-cyan) 10%, transparent)",
          }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: "var(--neon-cyan)" }} />
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}
