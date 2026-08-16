"use client";

import type { MusicRange } from "@questorylabs/shared";

const PERIOD_RANGES: { value: MusicRange; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const ALL_RANGE: { value: MusicRange; label: string } = {
  value: "all",
  label: "All",
};

export function MusicRangePicker({
  value,
  onChange,
  includeAll = false,
}: {
  value: MusicRange;
  onChange: (range: MusicRange) => void;
  includeAll?: boolean;
}) {
  const ranges = includeAll ? [...PERIOD_RANGES, ALL_RANGE] : PERIOD_RANGES;
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded border border-[var(--line)] p-1"
      role="group"
      aria-label="Time range"
    >
      {ranges.map((r) => {
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
