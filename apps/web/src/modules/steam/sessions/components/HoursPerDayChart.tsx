"use client";

import type { CSSProperties } from "react";
import type { PlaySessionDayBucket } from "@questorylabs/shared";
import { cn } from "@questorylabs/ui";
import { SESSIONS_DENSE_BAR_THRESHOLD } from "../steam.sessions.constants";
import { hoursPerDay, roundHours } from "./sessions-insights";

const barTone = (peak: boolean, last: boolean) =>
  peak
    ? "bg-white shadow-[0_0_18px_rgba(255,255,255,0.45)]"
    : last
      ? "bg-[#bdbdc2]"
      : "bg-white/[0.16]";

export const HoursPerDayChart = ({
  byDay,
  windowDays,
}: {
  byDay: PlaySessionDayBucket[];
  windowDays: number;
}) => {
  const model = hoursPerDay(byDay);
  const max = model.peakHours;
  const avgPct = max > 0 ? (model.avgHours / max) * 100 : 0;
  const peakLabel = model.peakLabel
    ? `peak ${roundHours(max * 3600)} h · ${model.peakLabel}`
    : null;
  const first = model.bars[0];
  const mid = model.bars[Math.floor((model.bars.length - 1) / 2)];
  const dense = model.bars.length > SESSIONS_DENSE_BAR_THRESHOLD;

  return (
    <section
      aria-labelledby="sessions-daily"
      className="panel q-in min-w-0 flex-[999_1_520px] px-[22px] pb-4 pt-5"
      style={{ "--i": 5 } as CSSProperties}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="sessions-daily" className="m-0 text-[17px] font-normal">
          Hours per day
        </h2>
        {peakLabel ? (
          <span className="font-mono text-[10px] text-[var(--faint)]">{peakLabel}</span>
        ) : null}
      </div>
      {max > 0 ? (
        <>
          <div
            role="img"
            aria-label={`Hours played per day, last ${windowDays} days${peakLabel ? `, ${peakLabel}` : ""}`}
            className={cn(
              "relative mt-[18px] flex h-[190px] items-end border-b border-white/[0.08]",
              dense ? "gap-[2px]" : "gap-2",
            )}
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-dashed border-[rgba(237,237,238,0.3)]"
              style={{ bottom: `${avgPct}%` }}
            />
            <span
              aria-hidden="true"
              className="absolute right-0 font-mono text-[10px] text-[var(--muted)]"
              style={{ bottom: `calc(${avgPct}% + 4px)` }}
            >
              avg {roundHours(model.avgHours * 3600)} h
            </span>
            {model.bars.map((bar, i) => (
              <span
                key={bar.key}
                title={`${bar.label} · ${roundHours(bar.hours * 3600)} h`}
                className={cn(
                  "q-grow min-h-[2px] flex-1 transition-colors duration-300 hover:!bg-white/55",
                  dense ? "rounded-[3px_3px_1px_1px]" : "rounded-[8px_8px_2px_2px]",
                  barTone(bar.peak, bar.last),
                )}
                style={{ "--i": i, height: `${(bar.hours / max) * 100}%` } as CSSProperties}
              />
            ))}
          </div>
          <div
            aria-hidden="true"
            className="mt-2 flex justify-between font-mono text-[10px] text-[var(--faint)]"
          >
            <span>{first?.label}</span>
            {model.bars.length > 2 ? <span>{mid?.label}</span> : null}
            <span>Today</span>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">No playtime in this window.</p>
      )}
    </section>
  );
};
