"use client";

import { useMemo, useRef, useState } from "react";
import {
  CALENDAR_HEATMAP_MAX_WEEKS,
  CALENDAR_MONTH_GAP_CLASS,
  CALENDAR_WEEK_GAP_CLASS,
} from "@/lib/charts";
import { ChartTooltip } from "./ChartTooltip";
import {
  buildCalendarGrid,
  chartAnchorPoint,
  HEATMAP_LEVEL_CLASS,
  heatmapLevel,
  shortDate,
} from "./chart-utils";

const CALENDAR_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type HoverDay = { date: string; value: number; x: number; y: number };

/** GitHub-style daily activity grid. */
export function CalendarHeatmap({
  days,
  ariaLabel = "Listening calendar",
  valueLabel = "listens",
}: {
  days: { date: string; value: number }[];
  ariaLabel?: string;
  valueLabel?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverDay | null>(null);

  const weeks = useMemo(
    () => buildCalendarGrid(days, CALENDAR_HEATMAP_MAX_WEEKS),
    [days],
  );
  const peak = Math.max(
    0,
    ...weeks.flatMap((week) => week.days.map((day) => day.value)),
  );

  if (weeks.length === 0 || peak <= 0) {
    return (
      <p className="text-xs text-[var(--muted)]">No listening in this range.</p>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <div
        className="overflow-x-auto"
        onMouseLeave={() => setHover(null)}
      >
        <div
          role="img"
          aria-label={ariaLabel}
          className="flex w-full min-w-[640px] gap-3"
        >
          <div className="flex shrink-0 flex-col gap-0.5 pt-4">
            {CALENDAR_DAY_LABELS.map((label, i) => (
              <div
                key={label}
                className="h-3 font-mono text-[9px] leading-3 text-[var(--faint)]"
              >
                {i % 2 === 0 ? label : "\u00a0"}
              </div>
            ))}
          </div>
          <div className="flex min-w-0 flex-1">
            {weeks.map((week, i) => (
              <div
                key={week.days[0].date}
                data-month-start={week.monthLabel ? "true" : undefined}
                className={`flex min-w-0 flex-1 flex-col gap-0.5 ${
                  i === 0
                    ? ""
                    : week.monthLabel
                      ? CALENDAR_MONTH_GAP_CLASS
                      : CALENDAR_WEEK_GAP_CLASS
                }`}
              >
                <div className="h-4 font-mono text-[9px] leading-4 text-[var(--faint)]">
                  {week.monthLabel ?? "\u00a0"}
                </div>
                {week.days.map((day) => {
                  const level = heatmapLevel(day.value, peak);
                  return (
                    <div
                      key={day.date}
                      aria-label={`${day.date}: ${day.value} ${valueLabel}`}
                      className={`h-3 w-full rounded-[2px] ${HEATMAP_LEVEL_CLASS[level]}`}
                      onMouseEnter={(e) => {
                        const root = rootRef.current;
                        if (!root) return;
                        setHover({
                          date: day.date,
                          value: day.value,
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
      </div>
      {hover ? (
        <ChartTooltip x={hover.x} y={hover.y}>
          <div className="text-[var(--muted)]">{shortDate(hover.date)}</div>
          <div className="mt-0.5 text-[var(--accent)]">
            {hover.value.toLocaleString()} {valueLabel}
          </div>
        </ChartTooltip>
      ) : null}
    </div>
  );
}
