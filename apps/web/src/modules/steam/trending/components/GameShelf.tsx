"use client";

import type { ReactNode } from "react";
import { ResourceStatus } from "@questorylabs/ui";

const ShelfSkeleton = () => (
  <div className="-mx-1 flex gap-4 overflow-hidden px-1 pb-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="w-[220px] shrink-0 sm:w-[260px]">
        <div className="aspect-[460/215] border border-[var(--line)] bg-[var(--bg-1)] hatch-fill" />
        <div className="mt-2 h-4 w-[70%] border border-[var(--line)] bg-[var(--bg-1)]" />
      </div>
    ))}
  </div>
);

export const GameShelf = ({
  title,
  description,
  meta,
  children,
  failed,
  empty,
  error,
  emptyContent,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  children: ReactNode;
  failed: boolean;
  empty: boolean;
  error: ReactNode;
  emptyContent?: ReactNode;
}) => (
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

    <ResourceStatus
      failed={failed}
      empty={empty}
      loading={<ShelfSkeleton />}
      error={error}
    >
      {emptyContent ?? (
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3 [scrollbar-width:thin]">
          {children}
        </div>
      )}
    </ResourceStatus>
  </section>
);

export const GameShelfItem = ({ children }: { children: ReactNode }) => (
  <div className="w-[220px] shrink-0 sm:w-[260px]">{children}</div>
);
