"use client";

import { useMemo } from "react";
import type { MusicTimeBucket } from "@questorylabs/shared";
import { LineChart } from "@/components/charts/LineChart";

function shortDate(label: string): string {
  const d = new Date(`${label}T12:00:00`);
  if (Number.isNaN(d.getTime())) return label;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function MusicSparkline({
  buckets,
  label = "Listening activity",
}: {
  buckets: MusicTimeBucket[];
  label?: string;
}) {
  const data = useMemo(
    () => buckets.map((b) => ({ label: b.label, value: b.count })),
    [buckets],
  );

  const stats = useMemo(() => {
    if (buckets.length === 0) return null;
    const total = buckets.reduce((sum, b) => sum + b.count, 0);
    const avg = total / buckets.length;
    const peak = buckets.reduce(
      (best, b) => (b.count > best.count ? b : best),
      buckets[0],
    );
    return { total, avg, peak };
  }, [buckets]);

  if (buckets.length < 2) {
    return (
      <p className="text-xs text-[var(--muted)]">Not enough activity yet.</p>
    );
  }

  return (
    <div>
      {stats ? (
        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[11px] text-[var(--muted)]">
          <span>
            <span className="text-[var(--ink)]">
              {stats.total.toLocaleString()}
            </span>{" "}
            listens
          </span>
          <span>
            <span className="text-[var(--ink)]">
              {formatCount(Math.round(stats.avg * 10) / 10)}
            </span>{" "}
            / day avg
          </span>
          {stats.peak.count > 0 ? (
            <span>
              peak{" "}
              <span className="text-[var(--ink)]">
                {stats.peak.count.toLocaleString()}
              </span>{" "}
              on {shortDate(stats.peak.label)}
            </span>
          ) : null}
        </div>
      ) : null}

      <LineChart
        data={data}
        ariaLabel={label}
        valueLabel="listens"
      />
    </div>
  );
}
