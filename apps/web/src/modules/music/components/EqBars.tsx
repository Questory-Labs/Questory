import type { CSSProperties } from "react";
import { cn } from "@questorylabs/ui";

const HEIGHTS = [62, 38, 84, 51, 96, 44, 70, 33, 88, 57, 41, 76, 49, 92];
const OPACITIES = [0.9, 0.55, 0.8, 0.65, 1, 0.5, 0.85, 0.6, 0.95, 0.7, 0.5, 0.8, 0.6, 0.9];

export const EqBars = ({
  count = 14,
  className,
  barClassName = "w-1",
}: {
  count?: number;
  className?: string;
  barClassName?: string;
}) => (
  <div
    aria-hidden="true"
    data-testid="music-eq"
    className={cn("flex flex-none items-end gap-1", className)}
  >
    {Array.from({ length: count }, (_, i) => (
      <span
        key={i}
        className={cn("q-eq rounded-sm bg-[var(--ink)]", barClassName)}
        style={
          {
            "--i": i,
            height: `${HEIGHTS[i % HEIGHTS.length]}%`,
            opacity: OPACITIES[i % OPACITIES.length],
          } as CSSProperties
        }
      />
    ))}
  </div>
);
