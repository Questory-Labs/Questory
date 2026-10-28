import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { HatchShadow } from "./HatchShadow";

export const emptyStateFaceVariants = cva("panel q-in text-center", {
  variants: {
    size: {
      sm: "px-5 py-7",
      md: "px-6 py-10",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type EmptyStateVariantProps = VariantProps<typeof emptyStateFaceVariants>;
export type EmptyStateSize = NonNullable<EmptyStateVariantProps["size"]>;

export function EmptyState({
  title,
  description,
  className,
  size,
}: EmptyStateVariantProps & {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <HatchShadow
      className={className}
      faceClassName={emptyStateFaceVariants({ size })}
    >
      <div aria-hidden className="dot-matrix mx-auto mb-4 h-8 w-20 opacity-20 [mask-image:radial-gradient(closest-side,#000,transparent)]" />
      <p className="font-display text-lg text-[var(--ink)]">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{description}</p>
      ) : null}
    </HatchShadow>
  );
}
