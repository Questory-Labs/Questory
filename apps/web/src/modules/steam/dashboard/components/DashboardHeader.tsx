"use client";

import type { ReactNode } from "react";
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  DASHBOARD_TIME_RANGES,
  type DashboardTimeRange,
} from "../steam.dashboard.constants";
import { greeting, headerDate } from "../dashboard-time";

export const DashboardHeader = ({
  now,
  name,
  description,
  range,
  onRangeChange,
}: {
  now: Date | null;
  name?: string;
  description?: ReactNode;
  range?: DashboardTimeRange;
  onRangeChange?: (range: DashboardTimeRange) => void;
}) => (
  <header className="q-in flex flex-wrap items-end justify-between gap-4 px-1 pb-2.5 pt-2">
    <div className="min-w-0">
      <p className="m-0 min-h-[1lh] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">
        {now ? headerDate(now) : null}
      </p>
      <h1 className="mt-1.5 text-[clamp(34px,4vw,52px)] font-light leading-none tracking-[-0.035em]">
        {name ? (
          <>
            {now ? greeting(now) : "Hello"}, <em className="font-serif">{name}</em>
          </>
        ) : now ? (
          greeting(now)
        ) : (
          "Dashboard"
        )}
      </h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
      ) : null}
    </div>
    {range && onRangeChange ? (
      <SegmentedControl
        label="Range"
        value={range}
        onChange={onRangeChange}
        options={DASHBOARD_TIME_RANGES}
      />
    ) : null}
  </header>
);
