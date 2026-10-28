import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn";

export const pageHeaderVariants = cva("q-in", {
  variants: {
    size: {
      sm: "mb-5",
      md: "mb-8",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const pageHeaderTitleVariants = cva("font-display leading-none", {
  variants: {
    size: {
      sm: "text-[28px] sm:text-[32px]",
      md: "text-[clamp(34px,4vw,52px)]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const pageHeaderRowVariants = cva(
  "flex flex-wrap items-end justify-between gap-4",
  {
    variants: {
      eyebrow: {
        true: "mt-1.5",
        false: "",
      },
    },
    defaultVariants: {
      eyebrow: false,
    },
  },
);

export type PageHeaderVariantProps = VariantProps<typeof pageHeaderVariants>;
export type PageHeaderSize = NonNullable<PageHeaderVariantProps["size"]>;

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  size,
}: PageHeaderVariantProps & {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn(pageHeaderVariants({ size }), className)}>
      {eyebrow ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">
          {eyebrow}
        </p>
      ) : null}
      <div className={pageHeaderRowVariants({ eyebrow: Boolean(eyebrow) })}>
        <div className="min-w-0">
          <h1 className={pageHeaderTitleVariants({ size })}>{title}</h1>
          {description ? (
            <div className="mt-3 max-w-2xl text-sm text-[var(--muted)]">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
