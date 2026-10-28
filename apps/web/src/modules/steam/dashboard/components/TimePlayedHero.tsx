"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { CountUp } from "@questorylabs/ui";
import { DASHBOARD_CHART } from "../steam.dashboard.constants";
import type { TimeChartModel, TimePlayedModel } from "../dashboard-time";
import { ArrowGlyph } from "./NowCard";

const TimeChart = ({ chart }: { chart: TimeChartModel }) => {
  const { width, height, bandWidth } = DASHBOARD_CHART;
  return (
    <svg
      viewBox={`0 0 ${width} ${height + 30}`}
      role="img"
      aria-label={chart.ariaLabel}
      className="mt-3.5 h-auto w-full overflow-visible"
    >
      <defs>
        <linearGradient id="dashboard-time-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.09" />
        </linearGradient>
      </defs>
      {chart.peaks.map((p) => (
        <rect
          key={`band-${p.index}`}
          x={p.x - bandWidth / 2}
          y="0"
          width={bandWidth}
          height={height}
          fill="url(#dashboard-time-band)"
        />
      ))}
      <line
        x1="0"
        y1={chart.avgY}
        x2={width}
        y2={chart.avgY}
        stroke="#ededee"
        strokeOpacity="0.35"
        strokeDasharray="8 6"
      />
      <text
        x={width}
        y={chart.avgY - 8}
        textAnchor="end"
        fill="#8d8d92"
        fontFamily="JetBrains Mono, monospace"
        fontSize="10"
      >
        {chart.avgLabel}
      </text>
      <path
        className="q-draw"
        pathLength={1}
        d={chart.path}
        fill="none"
        stroke="#bdbdc2"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {chart.peaks.map((p, i) => (
        <circle
          key={`peak-${p.index}`}
          className="q-pop"
          cx={p.x}
          cy={p.y}
          r="3.6"
          fill="#ffffff"
          style={{ "--i": i, filter: "drop-shadow(0 0 6px rgba(255,255,255,0.9))" } as CSSProperties}
        />
      ))}
      {chart.ticks.map((t) => (
        <text
          key={t.label}
          x={t.x + 4}
          y={height + 24}
          fill="#6c6c71"
          fontFamily="JetBrains Mono, monospace"
          fontSize="10"
        >
          {t.label}
        </text>
      ))}
    </svg>
  );
};

export const TimePlayedHero = ({ model }: { model: TimePlayedModel }) => {
  const delta = model.deltaHours;
  return (
    <section
      aria-labelledby="dashboard-time"
      className="panel q-lift q-in flex flex-1 flex-col px-5 pb-4 pt-5"
      style={{ "--i": 3 } as CSSProperties}
    >
      <div className="flex items-start justify-between">
        <h2 id="dashboard-time" className="m-0 text-[17px] font-normal">
          Time played
        </h2>
        <Link
          href="/sessions"
          aria-label="Open sessions"
          className="grid size-[34px] place-items-center rounded-full text-[var(--ink)] transition-colors hover:bg-white/10"
        >
          <ArrowGlyph size={14} />
        </Link>
      </div>
      <p className="mt-1.5 text-[64px] font-extralight leading-none tracking-[-0.04em]">
        <CountUp value={model.hours} decimals={1} dimDecimals />
        <span className="ml-1.5 text-base tracking-normal text-[var(--muted)]">h</span>
      </p>
      {model.avgPerDayHours != null || delta != null ? (
        <p className="mt-2.5 text-[13px] text-[var(--muted)]">
          {model.avgPerDayHours != null ? (
            <>
              Average <span className="text-[var(--ink)]">{model.avgPerDayHours} h</span>{" "}
              {model.avgScope}
            </>
          ) : null}
          {delta != null ? (
            <>
              {" · "}
              <span className={delta >= 0 ? "text-[var(--ok)]" : "text-[var(--muted)]"}>
                {delta >= 0 ? "+" : "−"}
                {Math.abs(delta)} h
              </span>{" "}
              on last week
            </>
          ) : null}
        </p>
      ) : null}
      {model.chart ? <TimeChart chart={model.chart} /> : null}
    </section>
  );
};
