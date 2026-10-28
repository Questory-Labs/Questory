"use client";

import { DOMAIN_COLOR, TABS } from "../enterprise.recommendations.constants";
import type { RecsTab } from "../enterprise.recommendations.types";

export const DomainTabs = ({
  tab,
  onChange,
}: {
  tab: RecsTab;
  onChange: (tab: RecsTab) => void;
}) => {
  const index = Math.max(
    0,
    TABS.findIndex((t) => t.id === tab),
  );
  return (
    <div
      role="tablist"
      aria-label="Domains"
      className="relative grid grid-cols-5 rounded-full border border-[var(--line)] bg-white/[0.04] p-1"
    >
      <span
        aria-hidden="true"
        className="q-slide absolute inset-y-1 left-1 w-[calc((100%-8px)/5)] rounded-full bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`relative inline-flex min-h-[38px] min-w-[64px] items-center justify-center gap-1.5 px-2 text-[13px] transition-colors sm:min-w-[76px] ${
              active ? "text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            <span
              aria-hidden="true"
              className="size-[5px] rounded-full"
              style={{ background: DOMAIN_COLOR[t.id] }}
            />
            {t.label}
          </button>
        );
      })}
    </div>
  );
};
