"use client";

import { useMemo, useState } from "react";
import { HEATMAP_HOUR_TICK_STEP } from "@/lib/charts";
import { HEATMAP_LEVEL_CLASS, heatmapLevel } from "./chart-utils";
import type { HeatmapCell } from "./types";

/** Day × hour activity grid. */
export function HeatmapChart({
  cells,
  dayLabels,
  hourLabels,
  maxValue,
  ariaLabel = "Listening heatmap",
  valueLabel = "listens",
}: {
  cells: HeatmapCell[];
  dayLabels: string[];
  hourLabels: string[];
  maxValue?: number;
  ariaLabel?: string;
  valueLabel?: string;
}) {
  const [hover, setHover] = useState<HeatmapCell | null>(null);

  const byKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of cells) map.set(`${cell.day}-${cell.hour}`, cell.value);
    return map;
  }, [cells]);

  const peak =
    maxValue ?? Math.max(0, ...cells.map((cell) => cell.value), 0);

  if (peak <= 0) {
    return (
      <p className="text-xs text-[var(--muted)]">No listening in this range.</p>
    );
  }

  return (
    <div className="relative w-full overflow-x-auto">
      <div
        role="img"
        aria-label={ariaLabel}
        className="grid w-full min-w-[640px] gap-0.5 [grid-template-columns:auto_repeat(24,minmax(0,1fr))]"
        onMouseLeave={() => setHover(null)}
      >
        <div />
        {hourLabels.map((label, hour) => (
          <div
            key={`h-${hour}`}
            className="pb-1 text-center font-mono text-[9px] text-[var(--faint)]"
          >
            {hour % HEATMAP_HOUR_TICK_STEP === 0 ? label : "\u00a0"}
          </div>
        ))}
        {dayLabels.map((dayLabel, day) => (
          <div key={`d-${day}`} className="contents">
            <div className="pr-2 text-right font-mono text-[10px] leading-4 text-[var(--faint)]">
              {dayLabel}
            </div>
            {hourLabels.map((hourLabel, hour) => {
              const value = byKey.get(`${day}-${hour}`) ?? 0;
              const level = heatmapLevel(value, peak);
              return (
                <div
                  key={`${day}-${hour}`}
                  aria-label={`${dayLabel} ${hourLabel}: ${value} ${valueLabel}`}
                  className={`h-3.5 w-full rounded-[2px] ${HEATMAP_LEVEL_CLASS[level]}`}
                  onMouseEnter={() => setHover({ day, hour, value })}
                />
              );
            })}
          </div>
        ))}
      </div>
      {hover ? (
        <div className="pointer-events-none absolute top-1 left-1/2 z-10 -translate-x-1/2 rounded border border-[var(--line-strong)] bg-[var(--bg-0)] px-3 py-2 font-mono text-[10px] text-[var(--ink)]">
          <div className="text-[var(--muted)]">
            {dayLabels[hover.day]} {hourLabels[hover.hour]}
          </div>
          <div className="mt-0.5 text-[var(--accent)]">
            {hover.value.toLocaleString()} {valueLabel}
          </div>
        </div>
      ) : null}
    </div>
  );
}
