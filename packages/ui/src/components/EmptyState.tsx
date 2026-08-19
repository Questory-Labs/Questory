import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { HatchShadow } from "./HatchShadow";

export const emptyStateFaceVariants = cva("panel text-center", {
  variants: {
    size: {
      sm: "px-4 py-6",
      md: "px-5 py-8",
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
      <p className="text-[var(--muted)]">{title}</p>
      {description ? (
        <p className="mt-2 text-sm text-[var(--faint)]">{description}</p>
      ) : null}
    </HatchShadow>
  );
}
