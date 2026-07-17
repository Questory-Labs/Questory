"use client";

import type { Store } from "@questorylabs/shared";

const LABELS: Record<Store, string> = {
  steam: "Steam",
  epic: "Epic",
  gog: "GOG",
};

const STYLES: Record<Store, string> = {
  steam: "bg-[#1b2838]/90 text-[#c7d5e0]",
  epic: "bg-[#2a2a2a]/90 text-[#ffffff]",
  gog: "bg-[#86328a]/90 text-[#ffffff]",
};

export function StoreBadge({
  store,
  compact = false,
}: {
  store: Store;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono uppercase tracking-wide ${
        compact ? "text-[9px]" : "text-[10px]"
      } ${STYLES[store]}`}
    >
      {LABELS[store]}
    </span>
  );
}

export function StoreBadgeRow({
  stores,
}: {
  stores?: Store[] | null;
}) {
  if (!stores?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {stores.map((s) => (
        <StoreBadge key={s} store={s} compact />
      ))}
    </div>
  );
}
