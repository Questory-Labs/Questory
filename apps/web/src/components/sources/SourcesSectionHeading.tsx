import type { ReactNode } from "react";

export function SourcesSectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
          {eyebrow}
        </div>
        <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-[var(--ink)]">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
