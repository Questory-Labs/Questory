"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export type ConnectionPill = {
  key: string;
  label: string;
  state: "on" | "off" | "error";
};

const PILL_STATE_TEXT: Record<ConnectionPill["state"], string> = {
  on: ", connected",
  off: ", not connected",
  error: ", connection error",
};

const PILL_DOT: Record<ConnectionPill["state"], string> = {
  on: "bg-[var(--ok)]",
  off: "bg-[#4a4a50]",
  error: "bg-[var(--warn)]",
};

export const ConnectionModuleCard = ({
  name,
  color,
  tint,
  index,
  summary,
  summaryTone,
  live = false,
  manageHref,
  pills,
  children,
}: {
  name: string;
  color: string;
  tint: string;
  index: number;
  summary: ReactNode;
  summaryTone: "ok" | "warn" | "muted";
  live?: boolean;
  manageHref: string;
  pills: ConnectionPill[];
  children?: ReactNode;
}) => (
  <li
    className="panel q-lift q-in relative overflow-hidden px-5 py-[18px]"
    style={{ "--i": index } as CSSProperties}
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ background: `radial-gradient(60% 120% at 0% 0%, ${tint}, transparent 60%)` }}
    />
    <div className="relative flex flex-wrap items-center gap-3">
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 12px ${color}` }}
      />
      <h2 className="flex-1 text-[19px] font-normal">{name}</h2>
      <span
        className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${
          summaryTone === "ok" ? "text-[var(--ok)]" : "text-[var(--muted)]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-[5px] w-[5px] rounded-full ${live ? "q-live" : ""} ${
            summaryTone === "ok"
              ? "bg-[var(--ok)]"
              : summaryTone === "warn"
                ? "bg-[var(--warn)]"
                : "bg-[var(--faint)]"
          }`}
        />
        {summary}
      </span>
      <Link
        href={manageHref}
        aria-label={`Manage ${name} connections`}
        className="inline-flex min-h-[38px] items-center rounded-full border border-white/[0.12] bg-white/[0.04] px-4 text-sm font-normal transition-[transform,border-color] duration-500 hover:-translate-y-px hover:border-white/25"
      >
        Manage
      </Link>
    </div>
    {pills.length ? (
      <ul className="relative mt-3.5 ml-5 flex flex-wrap gap-1.5">
        {pills.map((p) => (
          <li
            key={p.key}
            className={`inline-flex items-center gap-[7px] rounded-full border border-white/[0.07] px-3 py-[5px] text-[13px] ${
              p.state === "off"
                ? "bg-black/20 text-[var(--muted)]"
                : "bg-white/[0.05] text-[var(--ink)]"
            }`}
          >
            <span aria-hidden="true" className={`h-[5px] w-[5px] rounded-full ${PILL_DOT[p.state]}`} />
            {p.label}
            <span className="sr-only">{PILL_STATE_TEXT[p.state]}</span>
          </li>
        ))}
      </ul>
    ) : null}
    {children ? <div className="relative mt-3.5 ml-5">{children}</div> : null}
  </li>
);
