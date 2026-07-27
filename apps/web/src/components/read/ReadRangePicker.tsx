"use client";

import type { ReadRange } from "@questorylabs/shared";

const OPTIONS: { value: ReadRange; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

export function ReadRangePicker({
  value,
  onChange,
}: {
  value: ReadRange;
  onChange: (v: ReadRange) => void;
}) {
  return (
    <div className="inline-flex rounded border border-[var(--line)] bg-[var(--bg-1)] p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
            value === o.value
              ? "bg-[var(--bg-3)] text-[var(--ink)]"
              : "text-[var(--faint)] hover:text-[var(--muted)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
