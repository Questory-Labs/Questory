"use client";

/** Single-metric arc progress — scaffold for achievement % and coverage. */
export function GaugeChart({
  value: _value,
  max: _max = 100,
}: {
  value: number;
  max?: number;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <p className="text-xs text-[var(--muted)]">
      Gauge not yet wired.
    </p>
  );
}
