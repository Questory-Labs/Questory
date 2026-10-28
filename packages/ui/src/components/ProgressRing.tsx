import type { ReactNode } from "react";
import { cn } from "../cn";
import { useCountUp } from "./useCountUp";

export const ProgressRing = ({
  value,
  size = 96,
  stroke = 6,
  color = "var(--ink)",
  label,
  children,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  children?: ReactNode;
  className?: string;
}) => {
  const clamped = Math.max(0, Math.min(1, value));
  const shown = useCountUp(clamped);
  const r = (size - stroke) / 2;
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${shown.toFixed(4)} 1`}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      {children ? <div className="absolute inset-0 grid place-items-center">{children}</div> : null}
    </div>
  );
};
