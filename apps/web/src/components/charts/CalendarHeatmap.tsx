"use client";

import { useMemo, useState } from "react";
import { CALENDAR_HEATMAP_MAX_WEEKS } from "@/lib/charts";
import {
  buildCalendarGrid,
  HEATMAP_LEVEL_CLASS,
  heatmapLevel,
  shortDate,
} from "./chart-utils";

const CALENDAR_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const [hover, setHover] = useState<{ date: string; value: number } | null>(
    null,
  );

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
    <div className="relative w-full overflow-x-auto">
      <div
        role="img"
        aria-label={ariaLabel}
        className="inline-flex gap-3"
        onMouseLeave={() => setHover(null)}
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
        <div className="flex gap-0.5">
          {weeks.map((week) => (
            <div key={week.days[0].date} className="flex flex-col gap-0.5">
              <div className="h-4 font-mono text-[9px] leading-4 text-[var(--faint)]">
                {week.monthLabel ?? "\u00a0"}
              </div>
              {week.days.map((day) => {
                const level = heatmapLevel(day.value, peak);
                return (
                  <div
                    key={day.date}
                    aria-label={`${day.date}: ${day.value} ${valueLabel}`}
                    className={`h-3 w-3 rounded-[2px] ${HEATMAP_LEVEL_CLASS[level]}`}
                    onMouseEnter={() =>
                      setHover({ date: day.date, value: day.value })
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {hover ? (
        <div className="pointer-events-none absolute top-1 left-1/2 z-10 -translate-x-1/2 rounded border border-[var(--line-strong)] bg-[var(--bg-0)] px-3 py-2 font-mono text-[10px] text-[var(--ink)]">
          <div className="text-[var(--muted)]">{shortDate(hover.date)}</div>
          <div className="mt-0.5 text-[var(--accent)]">
            {hover.value.toLocaleString()} {valueLabel}
          </div>
        </div>
      ) : null}
    </div>
  );
}
