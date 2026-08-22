"use client";

import { InfoTip } from "./InfoTip";

export const DualRangeFilter = ({
  label,
  tip,
  display,
  minBound,
  maxBound,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  tip?: string;
  display: string;
  minBound: number;
  maxBound: number;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) => {
  const span = maxBound - minBound || 1;

  const clampMin = (value: number) => {
    const next = Math.min(Math.max(value, minBound), maxBound);
    onMinChange(next);
    if (next > maxValue) onMaxChange(next);
  };

  const clampMax = (value: number) => {
    const next = Math.min(Math.max(value, minBound), maxBound);
    onMaxChange(next);
    if (next < minValue) onMinChange(next);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          {label}
          {tip ? <InfoTip text={tip} /> : null}
        </span>
        <span className="font-mono text-[var(--ink)]">{display}</span>
      </div>
      <div className="relative h-6">
        <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-[var(--bg-3)]" />
        <div
          className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--accent)]"
          style={{
            left: `${((minValue - minBound) / span) * 100}%`,
            right: `${((maxBound - maxValue) / span) * 100}%`,
          }}
        />
        <input
          type="range"
          aria-label={`Minimum ${label.toLowerCase()}`}
          min={minBound}
          max={maxBound}
          value={minValue}
          onChange={(e) => clampMin(Number(e.target.value))}
          className="dual-range absolute inset-0 z-[1] w-full"
        />
        <input
          type="range"
          aria-label={`Maximum ${label.toLowerCase()}`}
          min={minBound}
          max={maxBound}
          value={maxValue}
          onChange={(e) => clampMax(Number(e.target.value))}
          className="dual-range absolute inset-0 z-[2] w-full"
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-[var(--faint)]">
        <span>{minBound}</span>
        <span>{maxBound}</span>
      </div>
    </div>
  );
};
