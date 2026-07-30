"use client";

/** GitHub-style daily activity grid — scaffold for streak views. */
export function CalendarHeatmap({
  days: _days,
}: {
  days: { date: string; value: number }[];
  ariaLabel?: string;
}) {
  return (
    <p className="text-xs text-[var(--muted)]">
      Calendar heatmap not yet wired.
    </p>
  );
}
