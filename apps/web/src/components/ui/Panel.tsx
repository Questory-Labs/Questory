import type { ReactNode } from "react";
import { HatchShadow } from "@/components/HatchShadow";

/** Hatch-elevated `.panel` — shared surface for StatCard, charts, and list rows. */
export function Panel({
  className = "",
  faceClassName = "",
  wrapperClassName = "",
  size = "md",
  children,
}: {
  /** Face styles (padding, layout) on the opaque `.panel`. */
  className?: string;
  /** Extra face classes (merged after `className`). */
  faceClassName?: string;
  /** Outer hatch wrapper only (margins, max-width, sticky). */
  wrapperClassName?: string;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  return (
    <HatchShadow
      size={size}
      className={wrapperClassName}
      faceClassName={`panel ${className} ${faceClassName}`.trim()}
    >
      {children}
    </HatchShadow>
  );
}
