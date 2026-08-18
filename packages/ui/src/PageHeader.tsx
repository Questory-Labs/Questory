import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

export const pageHeaderVariants = cva("", {
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

export const pageHeaderTitleVariants = cva("font-display tracking-tight", {
  variants: {
    size: {
      sm: "text-2xl sm:text-3xl",
      md: "text-4xl sm:text-5xl",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const pageHeaderRowVariants = cva(
  "flex flex-wrap items-start justify-between gap-4",
  {
    variants: {
      eyebrow: {
        true: "mt-2",
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
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          {eyebrow}
        </p>
      ) : null}
      <div className={pageHeaderRowVariants({ eyebrow: Boolean(eyebrow) })}>
        <div className="min-w-0">
          <h1 className={pageHeaderTitleVariants({ size })}>{title}</h1>
          {description ? (
            <div className="mt-3 max-w-2xl text-[var(--muted)]">{description}</div>
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
