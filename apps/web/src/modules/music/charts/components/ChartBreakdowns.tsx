"use client";

import type { MusicBreakdownResponse } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { Panel } from "@/components/ui";
import { formatShare } from "@/lib/music";

const BreakdownPanel = ({
  title,
  error,
  empty,
  resource,
}: {
  title: string;
  error: string;
  empty: string;
  resource: UseResourceResult<MusicBreakdownResponse>;
}) => {
  const items = resource.value?.items || [];
  const total = resource.value?.periodListens ?? 0;
  return (
    <ChartStatus
      failed={resource.failed}
      empty={resource.empty}
      title={title}
      error={error}
    >
      <Panel className="q-lift p-5">
        <h2 className="text-[17px] font-normal">{title}</h2>
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-[var(--ink)]">{item.label}</span>
              <span className="font-mono text-[11px] text-[var(--faint)]">
                {item.count}
                {resource.value ? ` · ${formatShare(item.count, total)}` : ""}
              </span>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="text-sm text-[var(--muted)]">{empty}</li>
          ) : null}
        </ul>
      </Panel>
    </ChartStatus>
  );
};

export const ChartBreakdowns = ({
  years,
  services,
}: {
  years: UseResourceResult<MusicBreakdownResponse>;
  services: UseResourceResult<MusicBreakdownResponse>;
}) => (
  <div className="q-in grid gap-3.5 [--i:5] lg:grid-cols-2">
    <BreakdownPanel
      title="Release years"
      error="Could not load release years."
      empty="No year data yet."
      resource={years}
    />
    <BreakdownPanel
      title="Sources"
      error="Could not load sources."
      empty="No source metadata yet."
      resource={services}
    />
  </div>
);
