"use client";

import type { ReactNode } from "react";
import { ResourceStatus } from "@questorylabs/ui";
import { TRENDING_GRID_CLASS, TRENDING_SKELETON_COUNT } from "../steam.trending.constants";

const ShelfSkeleton = ({ aspectClassName }: { aspectClassName: string }) => (
  <ul className={TRENDING_GRID_CLASS} aria-hidden>
    {Array.from({ length: TRENDING_SKELETON_COUNT }).map((_, i) => (
      <li key={i}>
        <div className={`hatch-fill rounded-[18px] border border-line bg-bg-1 ${aspectClassName}`} />
        <div className="mt-2.5 h-3.5 w-[70%] rounded-full bg-white/[0.05]" />
      </li>
    ))}
  </ul>
);

export const GameShelf = ({
  title,
  description,
  meta,
  live = false,
  aspectClassName = "aspect-[460/215]",
  children,
  failed,
  empty,
  error,
  emptyContent,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  live?: boolean;
  aspectClassName?: string;
  children: ReactNode;
  failed: boolean;
  empty: boolean;
  error: ReactNode;
  emptyContent?: ReactNode;
}) => (
  <section aria-label={title}>
    <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
      <h2 className="m-0 flex items-center gap-2.5 text-[26px] font-light tracking-[-0.02em]">
        {live ? (
          <span
            aria-hidden="true"
            className="q-live size-1.5 rounded-full bg-ok shadow-[0_0_10px_rgba(95,211,138,0.8)]"
          />
        ) : null}
        {title}
      </h2>
      {description || meta ? (
        <span className="label-mono tracking-[0.06em]">
          {description}
          {description && meta ? " · " : null}
          {meta}
        </span>
      ) : null}
    </div>
    <ResourceStatus
      failed={failed}
      empty={empty}
      loading={<ShelfSkeleton aspectClassName={aspectClassName} />}
      error={error}
    >
      {emptyContent ?? <ol className={TRENDING_GRID_CLASS}>{children}</ol>}
    </ResourceStatus>
  </section>
);
