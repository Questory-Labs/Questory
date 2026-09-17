"use client";

import { SessionRow } from "./components/SessionRow";
import { SessionsOverview } from "./components/SessionsOverview";
import {
  Button,
  EmptyState,
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonListRows,
  SkeletonStatGrid,
} from "@questorylabs/ui";
import { PLAY_SESSIONS_PAGE_SIZE } from "@/lib/pagination";
import type { SessionsViewProps } from "./steam.sessions.types";

export const SessionsView = (props: Record<string, unknown>) => {
  const { sessions, stats, page, setPage, dayGroups } =
    props as SessionsViewProps;
  const total = sessions.value?.total ?? 0;
  const pageSize = sessions.value?.pageSize ?? PLAY_SESSIONS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showOverview =
    stats.empty || stats.failed || (stats.value?.sessionCount ?? 0) > 0;

  return (
    <>
      <PageHeader
        size="sm"
        title="Sessions"
        description={
          total > 0
            ? `${total.toLocaleString()} local play session${total === 1 ? "" : "s"} from qMonitor`
            : "Local play sessions reported by qMonitor."
        }
      />

      {showOverview ? (
        <section className="mb-8" aria-label="Session overview">
          <ResourceStatus
            failed={stats.failed}
            empty={stats.empty}
            loading={<SkeletonStatGrid count={4} />}
            error={
              <EmptyState
                title={
                  <span className="text-[var(--danger)]">
                    Could not load session stats.
                  </span>
                }
              />
            }
          >
            {stats.value && stats.value.sessionCount > 0 ? (
              <SessionsOverview stats={stats.value} />
            ) : null}
          </ResourceStatus>
        </section>
      ) : null}

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
                  <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                    {group.label}
                  </h2>
                  <Panel variant="outline">
                    <ul className="divide-y divide-[var(--line)]">
                      {group.items.map((item) => (
                        <SessionRow
                          key={item.id}
                          item={item}
                          dayMaxSecs={Math.max(
                            ...group.items.map((s) => s.durationSecs),
                            1,
                          )}
                        />
                      ))}
                    </ul>
                  </Panel>
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
