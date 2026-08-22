"use client";

import { SessionRow } from "./components/SessionRow";
import {
  Button,
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonListRows,
} from "@questorylabs/ui";
import { PLAY_SESSIONS_PAGE_SIZE } from "@/lib/pagination";
import type { SessionsViewProps } from "./steam.sessions.types";

export const SessionsView = (props: Record<string, unknown>) => {
  const { sessions, page, setPage, dayGroups } = props as SessionsViewProps;
  const total = sessions.value?.total ?? 0;
  const pageSize = sessions.value?.pageSize ?? PLAY_SESSIONS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Sessions"
        description={
          total > 0
            ? `${total.toLocaleString()} local play session${total === 1 ? "" : "s"} from qMonitor`
            : "Local play sessions reported by qMonitor."
        }
      />

      <ResourceStatus
        failed={sessions.failed}
        empty={sessions.empty}
        loading={<SkeletonListRows />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load sessions.
              </span>
            }
          />
        }
      >
        {dayGroups.length > 0 ? (
          <>
            <div className="space-y-6">
              {dayGroups.map((group) => (
                <section key={group.dayKey}>
                  <h2 className="mb-1 border-b border-[var(--line)] pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                    {group.label}
                  </h2>
                  <ul className="divide-y divide-[var(--line)]">
                    {group.items.map((item) => (
                      <SessionRow key={item.id} item={item} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {total > pageSize && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  disabled={page <= 1 || sessions.refreshing}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5"
                >
                  Previous
                </Button>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages || sessions.refreshing}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="No sessions yet"
            description="Install qMonitor, authorize it against this account, and finish a game session — completed plays show up here."
          />
        )}
      </ResourceStatus>
    </>
  );
};
