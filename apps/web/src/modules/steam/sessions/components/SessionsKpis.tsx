"use client";

import type { CSSProperties, ReactNode } from "react";
import type { PlaySessionStats } from "@questorylabs/shared";
import { CountUp, cn } from "@questorylabs/ui";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatRelativePlayed } from "@/lib/dates";
import { formatSessionDuration } from "./session-format";
import { splitDuration, windowTotals } from "./sessions-insights";

const Unit = ({ children }: { children: ReactNode }) => (
  <span className="text-[18px] tracking-normal text-[var(--faint)]">{children}</span>
);

const Kpi = ({
  index,
  label,
  warn = false,
  hint,
  aside,
  children,
}: {
  index: number;
  label: string;
  warn?: boolean;
  hint?: string;
  aside?: ReactNode;
  children: ReactNode;
}) => (
  <div
    className={cn(
      "panel q-lift q-in px-5 py-[18px]",
      warn &&
        "!border-[rgba(245,165,36,0.2)] [background-image:linear-gradient(170deg,rgba(245,165,36,0.08),rgba(255,255,255,0.014)_60%)]",
    )}
    style={{ "--i": index } as CSSProperties}
  >
    <p className={cn("label-mono m-0", warn && "!text-[var(--warn)]")}>{label}</p>
    <div className="mt-3.5 flex items-end justify-between gap-3">
      <p className="m-0 text-[46px] font-extralight leading-[0.95] tracking-[-0.04em]">
        {children}
      </p>
      {aside ? <div className="shrink-0 pb-1">{aside}</div> : null}
    </div>
    {hint ? <p className="mt-2 text-xs text-[var(--faint)]">{hint}</p> : null}
  </div>
);

export const SessionsKpis = ({ stats }: { stats: PlaySessionStats }) => {
  const totals = windowTotals(stats);
  const played = splitDuration(totals.totalDurationSecs);
  const avgMinutes = Math.round(totals.avgDurationSecs / 60);
  const spark = stats.byDay.slice(-stats.weekDays).map((d) => d.durationSecs);
  const weekLine = `${stats.weekDays} d ${formatSessionDuration(stats.weekDurationSecs)}`;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
      <Kpi
        index={1}
        label="Played"
        hint={
          stats.lastPlayedAt
            ? `Last session ${formatRelativePlayed(stats.lastPlayedAt)} · ${weekLine}`
            : weekLine
        }
        aside={
          spark.length > 1 ? (
            <Sparkline
              data={spark}
              ariaLabel={`Playtime over the last ${stats.weekDays} days`}
            />
          ) : undefined
        }
      >
        <CountUp value={played.hours} />
        <Unit>h </Unit>
        <CountUp value={played.minutes} />
        <Unit>m</Unit>
      </Kpi>
      <Kpi
        index={2}
        label="Sessions"
        hint={`${stats.uniqueGames.toLocaleString()} linked game${stats.uniqueGames === 1 ? "" : "s"}`}
      >
        <CountUp value={totals.sessionCount} />
      </Kpi>
      <Kpi index={3} label="Average session">
        {avgMinutes >= 60 ? (
          <>
            <CountUp value={Math.floor(avgMinutes / 60)} />
            <Unit>h </Unit>
            <CountUp value={avgMinutes % 60} />
            <Unit>m</Unit>
          </>
        ) : (
          <>
            <CountUp value={avgMinutes} />
            <Unit>m</Unit>
          </>
        )}
      </Kpi>
      <Kpi
        index={4}
        label="Unmatched"
        warn={stats.unmatchedCount > 0}
        hint={
          stats.unmatchedCount === 0 ? "All sessions linked" : "Assign to a library game"
        }
      >
        <CountUp value={stats.unmatchedCount} />
      </Kpi>
    </div>
  );
};
