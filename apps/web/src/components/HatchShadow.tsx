import type { ReactNode } from "react";

type Size = "sm" | "md" | "lg";

/**
 * Drawn drop-shadow: a hatched slab sits behind an opaque face.
 * Never overlays content (unlike ::before z-index tricks).
 */
export function HatchShadow({
  children,
  size = "md",
  className = "",
  faceClassName = "",
}: {
  children: ReactNode;
  size?: Size;
  className?: string;
  faceClassName?: string;
}) {
  return (
    <div className={`hatch-shadow hatch-shadow--${size} ${className}`.trim()}>
      <span className="hatch-cast" aria-hidden />
      <div className={`hatch-face ${faceClassName}`.trim()}>{children}</div>
    </div>
  );
}
