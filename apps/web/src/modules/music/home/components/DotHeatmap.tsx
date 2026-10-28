"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { MusicHeatmap } from "@questorylabs/shared";
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

  return (
    <Panel wrapperClassName="h-full" className="q-lift h-full p-5">
      <section aria-labelledby="music-clock">
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
        <div
          role="img"
          aria-label={
            peakLabel
              ? `Listening by weekday and hour, brightest at ${peakLabel}`
              : "Listening by weekday and hour"
          }
          className="mt-4 grid grid-cols-[34px_repeat(24,minmax(0,1fr))] items-center gap-y-1.5"
        >
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <span className="font-mono text-[10px] text-[var(--faint)]">{row.label}</span>
              {row.cells.map((c) => (
                <span
                  key={c.key}
                  title={c.tip}
                  className="q-pop justify-self-center transition-transform duration-300 hover:scale-[1.9]"
                  style={
                    {
                      "--i": c.index % 24,
                      width: `${c.size}px`,
                      height: `${c.size}px`,
                      background: `linear-gradient(${c.color}, ${c.color}) center / 100% 1px no-repeat, linear-gradient(${c.color}, ${c.color}) center / 1px 100% no-repeat`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="mt-2.5 grid grid-cols-[34px_repeat(4,minmax(0,1fr))] font-mono text-[10px] text-[var(--faint)]"
        >
          <span />
          {HOUR_TICKS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>
    </Panel>
  );
};
