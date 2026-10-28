"use client";

import { cn } from "@questorylabs/ui";
import { CHART_KINDS, type TopsKind } from "../music.charts.constants";

export const ChartTabs = ({
  kind,
  onChange,
}: {
  kind: TopsKind;
  onChange: (kind: TopsKind) => void;
}) => {
  const index = Math.max(
    0,
    CHART_KINDS.findIndex((k) => k.value === kind),
  );
  return (
    <div
      role="tablist"
      aria-label="Chart type"
      className="q-in relative grid max-w-full self-start overflow-x-auto rounded-full border border-white/[0.07] bg-white/[0.04] p-1 [--i:1]"
      style={{ gridTemplateColumns: `repeat(${CHART_KINDS.length}, minmax(76px, 96px))` }}
    >
      <span
        aria-hidden="true"
        className="q-slide absolute inset-y-1 left-1 rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        style={{
          width: `calc((100% - 8px) / ${CHART_KINDS.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {CHART_KINDS.map((k) => {
        const active = k.value === kind;
        return (
          <button
            key={k.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(k.value)}
            className={cn(
              "relative min-h-10 text-sm transition-colors duration-300",
              active ? "text-white" : "text-[var(--muted)] hover:text-[var(--ink)]",
            )}
          >
            {k.label}
          </button>
        );
      })}
    </div>
  );
};
