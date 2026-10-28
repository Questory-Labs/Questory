"use client";

import type { CSSProperties } from "react";
import { CountUp } from "@questorylabs/ui";
import type { RewindHeroModel } from "../media.rewind.summary.types";

export const RewindHero = ({
  hero,
  color,
}: {
  hero: RewindHeroModel;
  color: string;
}) => {
  const max = Math.max(0, ...hero.bars.map((b) => b.value));
  const first = hero.bars[0];
  const mid = hero.bars[Math.floor((hero.bars.length - 1) / 2)];
  const last = hero.bars[hero.bars.length - 1];
  const glow = `color-mix(in srgb, ${color} 18%, transparent)`;
  const accentPeak = !hero.daily;
  return (
    <section
      aria-label="Headline"
      className="panel q-in relative min-w-0 flex-[999_1_520px] overflow-hidden px-7 pb-5 pt-[26px] [background-image:linear-gradient(160deg,rgba(210,210,214,0.14),rgba(255,255,255,0.016)_55%)]"
      style={{ "--i": 2 } as CSSProperties}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-[120px] h-[360px] w-[420px] rounded-full blur-[10px]"
        style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }}
      />
      <span
        aria-hidden="true"
        className="dot-matrix q-twinkle pointer-events-none absolute right-0 top-0 h-[200px] w-[360px] opacity-40 [mask-image:radial-gradient(60%_70%_at_80%_20%,#000,transparent)]"
      />
      <p className="label-mono relative m-0 !text-muted">{hero.label}</p>
      <p className="relative mt-2.5 text-[clamp(64px,8vw,112px)] font-extralight leading-[0.9] tracking-[-0.055em]">
        <CountUp value={hero.value} decimals={hero.decimals} dimDecimals />
        {hero.unit ? (
          <span className="text-[0.36em] tracking-[-0.01em] text-faint">{hero.unit}</span>
        ) : null}
      </p>
      {hero.note ? <p className="relative mt-3 text-[#a1a1a6]">{hero.note}</p> : null}
      {hero.bars.length && max > 0 ? (
        <>
          <div
            role="img"
            aria-label={`${hero.daily ? "Day by day" : "Month by month"} activity${hero.daily ? ", weekends highlighted" : ""}${hero.peak ? `. ${hero.peak}` : ""}`}
            className="relative mt-[26px] grid h-[110px] items-end gap-1"
            style={{ gridTemplateColumns: `repeat(${hero.bars.length}, minmax(0, 1fr))` }}
          >
            {hero.bars.map((bar, i) => {
              const lit = bar.weekend || (accentPeak && bar.value === max);
              return (
                <span
                  key={bar.key}
                  title={bar.label}
                  className="q-grow block rounded-[6px_6px_2px_2px] transition-[height,background-color,box-shadow] duration-1000"
                  style={{
                    "--i": i,
                    height: `${bar.value > 0 ? Math.max(4, (bar.value / max) * 100) : 0}%`,
                    background: lit ? color : "rgba(255,255,255,0.14)",
                    boxShadow: lit ? `0 0 14px color-mix(in srgb, ${color} 55%, transparent)` : "none",
                  } as CSSProperties}
                />
              );
            })}
          </div>
          <div aria-hidden="true" className="relative mt-2 flex justify-between font-mono text-[10px] text-faint">
            <span>{first?.label}</span>
            {hero.bars.length > 2 ? <span>{mid?.label}</span> : null}
            <span>{last?.label}</span>
          </div>
          {hero.peak ? <p className="label-mono relative mt-3">{hero.peak}</p> : null}
        </>
      ) : null}
    </section>
  );
};
