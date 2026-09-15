"use client";

import type { ReactNode } from "react";
import { EmptyState, ResourceStatus, SkeletonStatGrid } from "@questorylabs/ui";
import { StatCard } from "@/components/StatCard";
import { formatMoney } from "@/lib/money";
import type { DashboardStats } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { useSyncJobs } from "@/hooks/useSyncJobs";

export const GlanceStats = ({
  stats,
  sync,
  extra,
}: {
  stats: UseResourceResult<DashboardStats>;
  sync: ReturnType<typeof useSyncJobs>;
  extra?: ReactNode;
}) => {
  const { value } = stats;
  const { active: syncing } = sync;

  return (
    <section className="mt-10" aria-label="Key stats">
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="font-display text-lg font-semibold">At a glance</h2>
        {syncing ? (
          <span className="font-mono text-[11px] text-[var(--warm)]">
            {sync.doneCount}/{sync.total}
            {sync.current ? ` · ${sync.current.label.toLowerCase()}` : " · syncing"}
          </span>
        ) : null}
      </div>
      <ResourceStatus
        failed={stats.failed}
        empty={stats.empty}
        loading={<SkeletonStatGrid count={extra ? 12 : 8} />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load dashboard stats.
              </span>
            }
          />
        }
      >
        <div
          className={
            extra
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          }
        >
          <StatCard
            label="Cost / hour"
            value={
              value?.costPerHour != null
                ? formatMoney(value.costPerHour, value.currency || "USD")
                : "—"
            }
            hint={
              value?.lifetimeAtCurrent
                ? `Library ~${formatMoney(value.lifetimeAtCurrent, value.currency || "USD")}`
                : "See Cost for library value"
            }
            href="/cost"
          />
          <StatCard
            label="Deal signals"
            value={value?.currentSalesCount ?? 0}
            href="/wishlist"
          />
          <StatCard label="Library" value={value?.librarySize ?? "—"} href="/library" />
          <StatCard
            label="Playtime"
            value={value ? `${value.totalPlaytimeHours}h` : "—"}
            href="/library"
          />
          <StatCard
            label="Unplayed"
            value={value?.unplayedCount ?? "—"}
            hint="Still waiting in the queue"
            href="/library"
          />
          <StatCard
            label="Wishlist"
            value={value?.wishlistCount ?? "—"}
            href="/wishlist"
          />
          <StatCard
            label="Near complete"
            value={value?.nearCompletionCount ?? "—"}
            hint="Over 80% achievements"
            href="/library"
          />
          <StatCard
            label="Friends"
            value={value?.activeFriends ?? "—"}
            href="/friends"
          />
          {extra}
        </div>
      </ResourceStatus>
    </section>
  );
};
