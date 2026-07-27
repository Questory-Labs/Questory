"use client";

import type { MusicTimeBucket } from "@questorylabs/shared";

export function MusicSparkline({
  buckets,
  label = "Listening activity",
}: {
  buckets: MusicTimeBucket[];
  label?: string;
}) {
  if (buckets.length < 2) {
    return (
      <p className="text-xs text-[var(--muted)]">Not enough activity yet.</p>
    );
  }

  const values = buckets.map((b) => b.count);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 640;
  const h = 96;
  const pad = 6;
  const points = buckets
    .map((b, i) => {
      const x = pad + (i / (buckets.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (b.count - min) / span) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const area = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-24 w-full overflow-visible"
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
      >
        <polygon
          fill="color-mix(in oklab, var(--accent) 18%, transparent)"
          points={area}
        />
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          points={points}
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-[var(--faint)]">
        <span>{buckets[0].label}</span>
        <span>{buckets[buckets.length - 1].label}</span>
      </div>
    </div>
  );
}
