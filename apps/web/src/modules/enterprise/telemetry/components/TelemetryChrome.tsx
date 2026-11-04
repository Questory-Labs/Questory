"use client";

import type { ReactNode } from "react";
import { ADMIN_SECTION_TITLE } from "@/modules/admin/shared/admin.styles";

export const TitledPanel = ({
  title,
  description,
  index = 0,
  children,
}: {
  title: string;
  description?: ReactNode;
  index?: number;
  children: ReactNode;
}) => (
  <section
    className="panel q-in min-w-0 px-5 py-[18px]"
    style={{ "--i": index } as React.CSSProperties}
  >
    <h2 className={ADMIN_SECTION_TITLE}>{title}</h2>
    {description ? (
      <p className="mt-1 text-[13px] text-[var(--muted)]">{description}</p>
    ) : null}
    <div className="mt-4">{children}</div>
  </section>
);

export const MiniStat = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-[var(--radius)] border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
    <p className="label-mono">{label}</p>
    <p className="mt-1.5 font-mono text-sm text-[var(--ink)]">{value}</p>
  </div>
);

const pagerButton =
  "min-h-8 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 text-xs text-[var(--ink)] transition hover:border-white/[0.22] disabled:cursor-not-allowed disabled:opacity-40";

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
  <div className="flex items-center gap-2">
    <button
      type="button"
      disabled={disabled || page <= 0}
      onClick={() => onChange(page - 1)}
      className={pagerButton}
    >
      Prev
    </button>
    <span className="font-mono text-xs text-[var(--muted)]">
      {page + 1}/{totalPages}
    </span>
    <button
      type="button"
      disabled={disabled || page >= totalPages - 1}
      onClick={() => onChange(page + 1)}
      className={pagerButton}
    >
      Next
    </button>
  </div>
);
