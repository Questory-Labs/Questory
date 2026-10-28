"use client";

import { TRENDING_TAB_WIDTH, TRENDING_TABS, type TrendingTab } from "../steam.trending.constants";

export const TrendingTabs = ({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly TrendingTab[];
  value: TrendingTab;
  onChange: (tab: TrendingTab) => void;
}) => {
  const items = TRENDING_TABS.filter((t) => tabs.includes(t.value));
  if (items.length < 2) return null;
  const active = Math.max(0, items.findIndex((t) => t.value === value));
  return (
    <div
      role="tablist"
      aria-label="Medium"
      className="relative inline-grid max-w-full overflow-x-auto rounded-full border border-line bg-white/[0.04] p-1"
      style={{ gridTemplateColumns: `repeat(${items.length}, ${TRENDING_TAB_WIDTH}px)` }}
    >
      <span
        aria-hidden="true"
        className="q-slide absolute bottom-1 left-1 top-1 rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        style={{ width: TRENDING_TAB_WIDTH, transform: `translateX(${active * TRENDING_TAB_WIDTH}px)` }}
      />
      {items.map((t) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.value)}
            className={`relative inline-flex min-h-10 items-center justify-center gap-[7px] text-sm transition-colors duration-300 ${
              selected ? "text-white" : "text-muted hover:text-ink"
            }`}
          >
            <span aria-hidden="true" className="size-[5px] rounded-full" style={{ background: t.color }} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
};
