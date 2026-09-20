"use client";

import { Button } from "@/components/ui";
import type { FeatureFlagOrigin } from "@questorylabs/shared";

export const originCaption = (origin: FeatureFlagOrigin): string => {
  if (origin === "db") return "Saved in Admin";
  if (origin === "env") return "From environment";
  return "Default";
};

export const FlagToggle = ({
  label,
  hint,
  origin,
  enabled,
  busy,
  onToggle,
}: {
  label: string;
  hint: string;
  origin: FeatureFlagOrigin;
  enabled: boolean;
  busy: boolean;
  onToggle: () => void;
}) => (
  <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] py-3 last:border-b-0">
    <div>
      <div className="text-sm font-medium text-[var(--ink)]">{label}</div>
      <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
        {originCaption(origin)}
      </p>
    </div>
    <Button
      size="sm"
      variant={enabled ? "primary" : "secondary"}
      disabled={busy}
      aria-pressed={enabled}
      onClick={onToggle}
    >
      {enabled ? "On" : "Off"}
    </Button>
  </div>
);
