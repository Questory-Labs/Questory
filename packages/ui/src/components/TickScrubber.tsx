import { cn } from "../cn";

export const TickScrubber = ({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) => {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("relative h-3", className)}
    >
      <div className="tick-track absolute inset-0" />
      <div className="tick-fill absolute inset-y-0 left-0" style={{ width: `${pct}%` }} />
      <span
        aria-hidden="true"
        className="q-bar absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ink)] shadow-[0_0_10px_rgba(255,255,255,0.7)]"
        style={{ left: `${pct}%`, transitionProperty: "left" }}
      />
    </div>
  );
};
