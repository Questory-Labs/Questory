"use client";

import type { ReactNode } from "react";

export function GameShelf({
  title,
  description,
  meta,
  children,
  empty,
  loading,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  children: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div className="min-w-0">
          <h2
            className="font-display text-2xl tracking-tight"
            style={{ fontWeight: 700 }}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {meta ? (
          <div className="shrink-0 font-mono text-[11px] text-[var(--faint)]">
            {meta}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="-mx-1 flex gap-4 overflow-hidden px-1 pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-[220px] shrink-0 sm:w-[260px]"
            >
              <div className="aspect-[460/215] border border-[var(--line)] bg-[var(--bg-1)] hatch-fill" />
              <div className="mt-2 h-4 w-[70%] border border-[var(--line)] bg-[var(--bg-1)]" />
            </div>
          ))}
        </div>
      ) : empty ? (
        empty
      ) : (
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3 [scrollbar-width:thin]">
          {children}
        </div>
      )}
    </section>
  );
}

export function GameShelfItem({ children }: { children: ReactNode }) {
  return (
    <div className="w-[220px] shrink-0 sm:w-[260px]">{children}</div>
  );
}
