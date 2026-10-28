"use client";

import { useMemo } from "react";
import type { MusicTimeBucket } from "@questorylabs/shared";
import { Panel } from "@/components/ui";
import {
  DAILY_CHART_HEIGHT,
  DAILY_CHART_WIDTH,
  buildDailyLine,
} from "../music.home.utils";

export const DailyPlaysChart = ({
  buckets,
  target,
}: {
  buckets: MusicTimeBucket[];
  target: number | null;
}) => {
  const line = useMemo(() => buildDailyLine(buckets, target), [buckets, target]);
  if (!line) return null;

  return (
    <Panel className="q-lift p-5">
      <section aria-labelledby="music-daily-plays">
        <div className="flex flex-wrap justify-between gap-2">
          <h2 id="music-daily-plays" className="text-[17px] font-normal">
            Daily plays
          </h2>
          {line.targetY != null && target != null ? (
            <p className="text-[13px] text-[var(--muted)]">
              Target <span className="text-[var(--ink)]">{target} / day</span>
              {line.quietDays > 0 ? (
                <>
                  {" · "}
                  <span className="text-[var(--warn)]">
                    {line.quietDays} quiet {line.quietDays === 1 ? "day" : "days"}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <svg
          viewBox={`0 0 ${DAILY_CHART_WIDTH} ${DAILY_CHART_HEIGHT + 20}`}
          role="img"
          aria-label={`Plays per day across ${line.points.length} days`}
          className="mt-3 h-auto w-full overflow-visible"
        >
          {line.targetY != null ? (
            <line
              x1="0"
              y1={line.targetY}
              x2={DAILY_CHART_WIDTH}
              y2={line.targetY}
              stroke="var(--ink)"
              strokeOpacity="0.3"
              strokeDasharray="8 6"
            />
          ) : null}
          <path
            className="q-draw"
            pathLength={1}
            d={line.path}
            fill="none"
            stroke="#bdbdc2"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {line.quietPaths.map((d) => (
            <path
              key={d}
              className="q-draw"
              pathLength={1}
              d={d}
              fill="none"
              stroke="var(--warn)"
              strokeWidth="1.8"
            />
          ))}
          {line.peaks.map((p) => (
            <circle
              key={p.key}
              cx={p.x}
              cy={p.y}
              r="3.6"
              fill="#ffffff"
              className="drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]"
            >
              <title>{`${p.key} · ${p.count} plays`}</title>
            </circle>
          ))}
          {line.ticks.map((t) => (
            <text
              key={t.x}
              x={t.x}
              y={DAILY_CHART_HEIGHT + 16}
              fill="var(--faint)"
              className="font-mono"
              fontSize="10"
            >
              {t.label}
            </text>
          ))}
        </svg>
      </section>
    </Panel>
  );
};
