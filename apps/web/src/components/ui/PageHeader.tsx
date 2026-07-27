import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`mb-8 ${className}`.trim()}>
      {eyebrow ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          {eyebrow}
        </p>
      ) : null}
      <div
        className={`flex flex-wrap items-start justify-between gap-4 ${
          eyebrow ? "mt-2" : ""
        }`}
      >
        <div className="min-w-0">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
            {title}
          </h1>
          {description ? (
            <div className="mt-3 max-w-2xl text-[var(--muted)]">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
