import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn";

export const hatchShadowVariants = cva("hatch-shadow", {
  variants: {
    size: {
      sm: "hatch-shadow--sm",
      md: "hatch-shadow--md",
      lg: "hatch-shadow--lg",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type HatchShadowVariantProps = VariantProps<typeof hatchShadowVariants>;
export type HatchShadowSize = NonNullable<HatchShadowVariantProps["size"]>;

/**
 * Drawn drop-shadow: a hatched slab sits behind an opaque face.
 * Never overlays content (unlike ::before z-index tricks).
 */
export function HatchShadow({
  children,
  size,
  className,
  faceClassName,
}: HatchShadowVariantProps & {
  children: ReactNode;
  className?: string;
  faceClassName?: string;
}) {
  return (
    <div className={cn(hatchShadowVariants({ size }), className)}>
      <span className="hatch-cast" aria-hidden />
      <div className={cn("hatch-face", faceClassName)}>{children}</div>
    </div>
  );
}
