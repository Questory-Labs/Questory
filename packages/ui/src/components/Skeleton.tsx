import type { CSSProperties } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn";

export const skeletonVariants = cva(
  "motion-safe:animate-pulse rounded-md bg-[var(--line)]",
);

export const skeletonTextVariants = cva("h-3", {
  variants: {
    width: {
      full: "w-full",
      last: "w-2/3",
    },
  },
  defaultVariants: {
    width: "full",
  },
});

export const skeletonTileVariants = cva(
  "overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-2)]",
);

export const skeletonRowVariants = cva("flex items-center gap-3");

export const skeletonGridVariants = cva("grid gap-4", {
  variants: {
    layout: {
      tiles: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      stats: "sm:grid-cols-2 lg:grid-cols-4",
    },
  },
  defaultVariants: {
    layout: "tiles",
  },
});

export type SkeletonGridVariantProps = VariantProps<typeof skeletonGridVariants>;

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(skeletonVariants(), className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 1,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={skeletonTextVariants({
            width: i === lines - 1 && lines > 1 ? "last" : "full",
          })}
        />
      ))}
    </div>
  );
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-3 h-8 w-24" />
    </div>
  );
}

export function SkeletonTile({ className }: { className?: string }) {
  return (
    <div className={cn(skeletonTileVariants(), className)} aria-hidden="true">
      <Skeleton className="aspect-[460/215] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn(skeletonRowVariants(), className)} aria-hidden="true">
      <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonChart({
  height = 160,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <Skeleton className={cn("w-full", className)} style={{ height }} aria-hidden />
  );
}

export function SkeletonTileGrid({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(skeletonGridVariants({ layout: "tiles" }), className)}
      aria-busy="true"
      aria-label="Loading content"
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonTile key={i} />
      ))}
    </div>
  );
}

export function SkeletonListRows({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonDetailHeader({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)} aria-busy="true">
      <Skeleton className="h-40 w-full max-w-xl rounded-lg" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonStatGrid({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(skeletonGridVariants({ layout: "stats" }), className)}
      aria-busy="true"
      aria-label="Loading stats"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--line)] bg-[var(--bg-2)] p-4"
        >
          <SkeletonStat />
        </div>
      ))}
    </div>
  );
}
