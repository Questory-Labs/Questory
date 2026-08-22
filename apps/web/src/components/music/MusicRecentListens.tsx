"use client";

import type { ReactNode } from "react";
import { ListPager } from "@/components/ListPager";
import { ResourceStatus, StateMessage } from "@/components/ui";

export const MusicRecentListens = ({
  total,
  itemCount,
  empty,
  failed,
  refreshing,
  page,
  pageSize,
  onPageChange,
  children,
}: {
  total: number;
  itemCount: number;
  empty: boolean;
  failed: boolean;
  refreshing: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  children: ReactNode;
}) => (
  <section className="mt-8">
    <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
      Recent listens
      {total > 0 ? ` · ${total.toLocaleString()}` : ""}
    </h2>
    <ResourceStatus
      failed={failed}
      empty={empty}
      loading={<StateMessage variant="loading" className="mt-3" />}
      error={
        <StateMessage variant="error">Could not load listens.</StateMessage>
      }
    >
      {itemCount === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          No listens in this range.
        </p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-[var(--line)]">{children}</ul>
          <ListPager
            className="mt-4"
            page={page}
            total={total}
            pageSize={pageSize}
            disabled={refreshing}
            onPageChange={onPageChange}
          />
        </>
      )}
    </ResourceStatus>
  </section>
);
