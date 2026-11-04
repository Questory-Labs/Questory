"use client";

import type { CSSProperties } from "react";
import { SessionRow } from "./components/SessionRow";
import { SessionsHeader } from "./components/SessionsHeader";
import { SessionsOverview } from "./components/SessionsOverview";
import { dominantDaypart, windowTotals } from "./components/sessions-insights";
import {
  Button,
  EmptyState,
  ResourceStatus,
  SkeletonListRows,
  SkeletonStatGrid,
} from "@questorylabs/ui";
import { PLAY_SESSIONS_PAGE_SIZE } from "@/lib/pagination";
import { SESSIONS_AXIS_TICKS } from "./steam.sessions.constants";
import type { SessionsViewProps } from "./steam.sessions.types";

export const SessionsView = (props: Record<string, unknown>) => {
  const { sessions, stats, page, setPage, dayGroups, range, setRange } =
    props as SessionsViewProps;
  const total = sessions.value?.total ?? 0;
  const pageSize = sessions.value?.pageSize ?? PLAY_SESSIONS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showOverview =
    stats.empty || stats.failed || (stats.value?.sessionCount ?? 0) > 0;
  const count = stats.value
    ? windowTotals(stats.value).sessionCount
    : sessions.value
      ? total
      : null;

  return (
    <div className="flex flex-col gap-4">
      <SessionsHeader
        count={count}
        daypart={dominantDaypart(stats.value?.byHour)}
        range={range}
        onRangeChange={setRange}
      />

      {showOverview ? (
        <section aria-label="Session overview">
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
          <section
            aria-labelledby="sessions-log"
            className="panel q-in px-2 pb-2 pt-[18px]"
            style={{ "--i": 7 } as CSSProperties}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-3.5">
              <h2
                id="sessions-log"
                className="m-0 text-[26px] font-light tracking-[-0.02em]"
              >
                The <em className="font-serif text-[#a1a1a6]">log</em>
              </h2>
              <span
                aria-hidden="true"
                className="flex w-[240px] justify-between font-mono text-[9px] text-[var(--dim)]"
              >
                {SESSIONS_AXIS_TICKS.map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </span>
            </div>
            {dayGroups.map((group) => (
              <div key={group.dayKey} className="mt-3">
                <h3 className="label-mono mb-1 px-3.5 font-normal">{group.label}</h3>
                <ul className="m-0 list-none p-0">
                  {group.items.map((item) => (
                    <SessionRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ))}

            {total > pageSize && (
              <div className="mt-4 flex items-center justify-center gap-3 pb-2">
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
          </section>
        ) : (
          <EmptyState
            title="No sessions yet"
            description="Install qMonitor, authorize it against this account, and finish a game session — completed plays show up here."
          />
        )}
      </ResourceStatus>
    </div>
  );
};
