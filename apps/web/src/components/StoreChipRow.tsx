"use client";

import { STORE_CHIPS } from "@/lib/store-chips";
import type { Store } from "@questorylabs/shared";

export const StoreChipRow = ({
  value,
  onChange,
}: {
  value: Store | "all";
  onChange: (id: Store | "all") => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {STORE_CHIPS.map((chip) => {
      const active = value === chip.id;
      return (
        <button
          key={chip.id}
          type="button"
          onClick={() => onChange(chip.id)}
          className={`rounded-md border px-3 py-1.5 text-sm transition ${
            active
              ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--ink)]"
              : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
          }`}
        >
          {chip.label}
        </button>
      );
    })}
  </div>
);
