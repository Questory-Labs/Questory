"use client";

import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import type { MusicHeatmap } from "@questorylabs/shared";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { chartAnchorPoint } from "@/components/charts/chart-utils";
import { Panel } from "@/components/ui";
import { buildDotHeatmap } from "../music.home.utils";

const HOUR_TICKS = ["00", "06", "12", "18"];

export const DotHeatmap = ({
  heatmap,
  caption,
}: {
  heatmap: MusicHeatmap | undefined;
  caption?: string | null;
}) => {
  const { rows, peakLabel } = useMemo(() => buildDotHeatmap(heatmap), [heatmap]);
  const peakText = [peakLabel, caption].filter(Boolean).join(" · ");
  const gridRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ tip: string; x: number; y: number } | null>(null);

  return (
    <Panel wrapperClassName="h-full" className="q-lift h-full p-5">
      <section aria-labelledby="music-clock" className="flex h-full flex-col">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="music-clock" className="text-[17px] font-normal">
            When you listen
          </h2>
          {peakText ? (
            <p className="text-[13px] text-[var(--muted)]">
              Peak <span className="text-[var(--ink)]">{peakText}</span>
            </p>
          ) : null}
        </div>
        <div className="relative mt-4 flex flex-1 flex-col" onMouseLeave={() => setHover(null)}>
          <div
            ref={gridRef}
            role="img"
            aria-label={
              peakLabel
                ? `Listening by weekday and hour, brightest at ${peakLabel}`
                : "Listening by weekday and hour"
            }
            className="grid flex-1 grid-cols-[34px_repeat(24,minmax(0,1fr))] items-center gap-y-1.5 @container auto-rows-[minmax(18px,1fr)]"
          >
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <span className="font-mono text-[10px] text-[var(--faint)]">{row.label}</span>
                {row.cells.map((c) => (
                  <span
                    key={c.key}
                    aria-label={c.tip}
                    className="group flex h-full items-center justify-center"
                    onMouseEnter={(e) => {
                      const root = gridRef.current;
                      if (root) {
                        setHover({
                          tip: c.tip,
                          ...chartAnchorPoint(e.currentTarget, root),
                        });
                      }
                    }}
                  >
                    <span
                      className="q-pop block transition-transform duration-300 group-hover:scale-[1.9]"
                      style={
                        {
                          "--i": c.index % 24,
                          width: `max(${c.size}px, calc(${c.size} * (100cqw - 34px) / 528))`,
                          height: `max(${c.size}px, calc(${c.size} * (100cqw - 34px) / 528))`,
                          background: `linear-gradient(${c.color}, ${c.color}) center / 100% 1px no-repeat, linear-gradient(${c.color}, ${c.color}) center / 1px 100% no-repeat`,
                        } as CSSProperties
                      }
                    />
                  </span>
                ))}
              </div>
            ))}
          </div>
          {hover ? (
            <ChartTooltip x={hover.x} y={hover.y}>
              {hover.tip}
            </ChartTooltip>
          ) : null}
        </div>
        <div
          aria-hidden="true"
          className="mt-2.5 grid grid-cols-[34px_repeat(24,minmax(0,1fr))] font-mono text-[10px] text-[var(--faint)]"
        >
          {HOUR_TICKS.map((t) => (
            <span
              key={t}
              className="justify-self-center"
              style={{ gridColumnStart: Number(t) + 2 }}
            >
              {t}
            </span>
          ))}
        </div>
      </section>
    </Panel>
  );
};
