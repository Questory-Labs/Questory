"use client";

import type { ValueTab } from "../steam.cost.types";

export const ValueTabs = ({
  value,
  onChange,
}: {
  value: ValueTab;
  onChange: (tab: ValueTab) => void;
}) => (
  <div className="flex gap-1 rounded-md border border-[var(--line)] p-0.5 text-sm">
    {(["paid", "free"] as const).map((tab) => (
      <button
        key={tab}
        type="button"
        onClick={() => onChange(tab)}
        className={`rounded px-3 py-1 font-semibold capitalize transition ${
          value === tab
            ? "bg-[var(--bg-2)] text-[var(--ink)]"
            : "text-[var(--muted)] hover:text-[var(--ink)]"
        }`}
      >
        {tab}
      </button>
    ))}
  </div>
);
