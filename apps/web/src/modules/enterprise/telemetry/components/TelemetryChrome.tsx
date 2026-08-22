"use client";

import { StatCard } from "@/components/StatCard";
import { Panel } from "@questorylabs/ui";
import type { ReactNode } from "react";

export const TitledPanel = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <Panel className="p-4">
    <h2 className="font-display text-lg font-bold text-[var(--ink)]">
      {title}
    </h2>
    <div className="mt-3">{children}</div>
  </Panel>
);

export const TelemetryStat = ({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) => (
  <StatCard
    label={label}
    value={loading ? "…" : value != null ? value.toLocaleString() : "—"}
  />
);

export const MiniStat = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <Panel size="sm" className="bg-[var(--bg-0)] px-3 py-2">
    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
      {label}
    </div>
    <div className="mt-1 font-mono text-sm text-[var(--ink)]">{value}</div>
  </Panel>
);

export const TelemetryPagination = ({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center gap-2 text-xs">
    <button
      type="button"
      disabled={disabled || page <= 0}
      onClick={() => onChange(page - 1)}
      className="px-2.5 py-1.5 text-[var(--muted)] transition hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:opacity-40"
    >
      Prev
    </button>
    <span className="font-mono text-[var(--muted)]">
      {page + 1}/{totalPages}
    </span>
    <button
      type="button"
      disabled={disabled || page >= totalPages - 1}
      onClick={() => onChange(page + 1)}
      className="px-2.5 py-1.5 text-[var(--muted)] transition hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:opacity-40"
    >
      Next
    </button>
  </div>
);
