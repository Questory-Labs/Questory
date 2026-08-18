import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";
import { HatchShadow, type HatchShadowSize } from "./HatchShadow";

export const panelFaceVariants = cva("", {
  variants: {
    variant: {
      elevated: "panel",
      accent: "panel-accent",
      outline: "panel-outline",
    },
  },
  defaultVariants: {
    variant: "elevated",
  },
});

export type PanelVariantProps = VariantProps<typeof panelFaceVariants>;
export type PanelVariant = NonNullable<PanelVariantProps["variant"]>;

/** Hatch-elevated `.panel` — shared surface for StatCard, charts, and list rows. */
export function Panel({
  className,
  faceClassName,
  wrapperClassName,
  size = "md",
  variant,
  children,
}: PanelVariantProps & {
  /** Face styles (padding, layout) on the opaque `.panel`. */
  className?: string;
  /** Extra face classes (merged after `className`). */
  faceClassName?: string;
  /** Outer hatch wrapper only (margins, max-width, sticky). */
  wrapperClassName?: string;
  size?: HatchShadowSize;
  children: ReactNode;
}) {
  const face = cn(panelFaceVariants({ variant }), className, faceClassName);
  const resolved = variant ?? "elevated";

  if (resolved === "outline") {
    return <div className={cn(face, wrapperClassName)}>{children}</div>;
  }

  return (
    <HatchShadow size={size} className={wrapperClassName} faceClassName={face}>
      {children}
    </HatchShadow>
  );
}
