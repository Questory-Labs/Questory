"use client";

import type { CSSProperties, ReactNode } from "react";

export type FamilyListPanelRow = {
  key: string | number;
  title: string;
  detail: ReactNode;
  onClick?: () => void;
};

const RowBody = ({ row }: { row: FamilyListPanelRow }) => (
  <>
    <span className="min-w-0 truncate font-normal">{row.title}</span>
    <span className="shrink-0 text-right text-[13px] text-[var(--muted)]">
      {row.detail}
    </span>
  </>
);

export const FamilyListPanel = ({
  title,
  description,
  tone,
  index,
  rows,
  empty,
  footer,
  status,
}: {
  title: string;
  description: string;
  tone: string;
  index: number;
  rows: FamilyListPanelRow[];
  empty: ReactNode;
  footer?: ReactNode;
  status?: ReactNode;
}) => (
  <section
    className="panel q-lift q-in px-3.5 pt-5 pb-3"
    style={{ "--i": index } as CSSProperties}
  >
    <h2
      className="mx-1.5 flex items-center gap-2 font-mono text-[10px] font-normal uppercase tracking-[0.08em]"
      style={{ color: tone }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: tone, boxShadow: `0 0 10px ${tone}` }}
      />
      {title}
    </h2>
    <p className="font-serif mx-1.5 mt-2 text-[19px] leading-tight text-[#cfcfd3]">
      {description}
    </p>
    {status ??
      (rows.length ? (
        <ul className="mt-3">
          {rows.map((r) => (
            <li
              key={r.key}
              className="rounded-[10px] border-t border-white/[0.05] transition-[padding,background-color] duration-500 hover:bg-white/[0.03] hover:pl-2.5"
            >
              {r.onClick ? (
                <button
                  type="button"
                  onClick={r.onClick}
                  className="flex w-full justify-between gap-3 px-1.5 py-2.5 text-left text-sm"
                >
                  <RowBody row={r} />
                </button>
              ) : (
                <div className="flex justify-between gap-3 px-1.5 py-2.5 text-sm">
                  <RowBody row={r} />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mx-1.5 mt-3 border-t border-white/[0.05] pt-3 text-sm text-[var(--muted)]">
          {empty}
        </p>
      ))}
    {footer}
  </section>
);
