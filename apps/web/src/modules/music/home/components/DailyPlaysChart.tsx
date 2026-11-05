"use client";

import { useMemo, useState } from "react";
import type { MusicTimeBucket } from "@questorylabs/shared";
import {
  ChartDot,
  ChartHoverCard,
  ChartHoverMarker,
} from "@/components/charts/ChartGrid";
import { Panel } from "@/components/ui";
import { CHART_LINE_COLOR } from "@/lib/charts";
import {
  DAILY_CHART_HEIGHT,
  DAILY_CHART_WIDTH,
  buildDailyLine,
  formatDayTick,
} from "../music.home.utils";

export const DailyPlaysChart = ({
  buckets,
  target,
}: {
  buckets: MusicTimeBucket[];
  target: number | null;
}) => {
  const line = useMemo(() => buildDailyLine(buckets, target), [buckets, target]);
  const [hover, setHover] = useState<number | null>(null);
  if (!line) return null;

  const active = hover != null ? line.points[hover] : null;
  const bandW = DAILY_CHART_WIDTH / (line.points.length - 1);

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
        <div className="relative mt-3">
          <svg
            viewBox={`0 0 ${DAILY_CHART_WIDTH} ${DAILY_CHART_HEIGHT + 20}`}
            role="img"
            aria-label={`Plays per day across ${line.points.length} days`}
            className="h-auto w-full overflow-visible"
            onMouseLeave={() => setHover(null)}
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
              stroke={CHART_LINE_COLOR}
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
              <ChartDot key={p.key} x={p.x} y={p.y} />
            ))}
            {line.ticks.map((t) => (
              <text
                key={t.x}
                x={t.x}
                y={DAILY_CHART_HEIGHT + 16}
                textAnchor={t.x >= DAILY_CHART_WIDTH ? "end" : "start"}
                fill="var(--faint)"
                className="font-mono"
                fontSize="10"
              >
                {t.label}
              </text>
            ))}
            {line.points.map((p, i) => (
              <rect
                key={`band-${p.key}`}
                x={p.x - bandW / 2}
                y={0}
                width={bandW}
                height={DAILY_CHART_HEIGHT}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            ))}
            {active ? (
              <ChartHoverMarker
                x={active.x}
                y={active.y}
                top={0}
                bottom={DAILY_CHART_HEIGHT}
              />
            ) : null}
          </svg>
          {active ? (
            <ChartHoverCard xPct={(active.x / DAILY_CHART_WIDTH) * 100}>
              <div className="text-[var(--muted)]">{formatDayTick(active.key)}</div>
              <div className="mt-0.5">
                {active.count} {active.count === 1 ? "play" : "plays"}
              </div>
            </ChartHoverCard>
          ) : null}
        </div>
      </section>
    </Panel>
  );
};
