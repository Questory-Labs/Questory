"use client";

import type { WatchRange } from "@questorylabs/shared";

const RANGES: { value: WatchRange; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

export function WatchRangePicker({
  value,
  onChange,
}: {
  value: WatchRange;
  onChange: (range: WatchRange) => void;
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded border border-[var(--line)] p-1"
      role="group"
      aria-label="Time range"
    >
      {RANGES.map((r) => {
        const active = r.value === value;
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => onChange(r.value)}
            className={`px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
              active
                ? "bg-[var(--ink)] text-[var(--bg-0)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
