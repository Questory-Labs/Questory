"use client";

import { useMemo, useRef, useState } from "react";
import { HEATMAP_HOUR_TICK_STEP } from "@/lib/charts";
import { ChartTooltip } from "./ChartTooltip";
import { HEATMAP_LEVEL_CLASS, chartAnchorPoint, heatmapLevel } from "./chart-utils";
import type { HeatmapCell } from "./types";

type HoverCell = HeatmapCell & { x: number; y: number };

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
  const rootRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverCell | null>(null);

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
    <div ref={rootRef} className="relative w-full">
      <div
        className="overflow-x-auto"
        onMouseLeave={() => setHover(null)}
        onScroll={() => setHover(null)}
      >
        <div
          role="img"
          aria-label={ariaLabel}
          className="grid w-full min-w-[640px] gap-0.5 [grid-template-columns:auto_repeat(24,minmax(0,1fr))]"
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
                    onMouseEnter={(e) => {
                      const root = rootRef.current;
                      if (!root) return;
                      setHover({
                        day,
                        hour,
                        value,
                        ...chartAnchorPoint(e.currentTarget, root),
                      });
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {hover ? (
        <ChartTooltip x={hover.x} y={hover.y}>
          <div className="text-[var(--muted)]">
            {dayLabels[hover.day]} {hourLabels[hover.hour]}
          </div>
          <div className="mt-0.5 text-[var(--accent)]">
            {hover.value.toLocaleString()} {valueLabel}
          </div>
        </ChartTooltip>
      ) : null}
    </div>
  );
}
