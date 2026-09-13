"use client";

import Link from "next/link";
import type { PlaySessionPage } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import {
  ResourceStatus,
  SkeletonListRows,
  StateMessage,
} from "@questorylabs/ui";
import { formatRelativePlayed, groupByLocalDay } from "@/lib/dates";
import { LIBRARY_GAME_SESSIONS_PAGE_SIZE } from "@/lib/pagination";
import { formatSessionDuration } from "../../sessions/components/session-format";

export const LibraryGameSessions = ({
  sessions,
}: {
  sessions: UseResourceResult<PlaySessionPage>;
}) => {
  const items = sessions.value?.items ?? [];
  const total = sessions.value?.total ?? 0;
  const pageSize = sessions.value?.pageSize ?? LIBRARY_GAME_SESSIONS_PAGE_SIZE;
  const dayGroups = groupByLocalDay(items, (s) => s.endedAt);

  return (
    <ResourceStatus
      failed={sessions.failed}
      empty={sessions.empty}
      loading={<SkeletonListRows className="mt-2" />}
      error={
        <StateMessage variant="error">Could not load sessions.</StateMessage>
      }
    >
      {total > 0 ? (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h3 className="font-display text-sm font-bold">Recent sessions</h3>
            <Link
              href="/sessions"
              className="font-mono text-[11px] text-[var(--accent)] hover:underline"
            >
              All sessions →
            </Link>
          </div>
          <div className="space-y-4">
            {dayGroups.map((group) => (
              <div key={group.dayKey}>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                  {group.label}
                </p>
                <ul className="divide-y divide-[var(--line)]">
                  {group.items.map((item) => {
                    const hostBits = [item.hostName, item.hostOs]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li
                        key={item.id}
                        className="flex items-baseline justify-between gap-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[11px] text-[var(--muted)]">
                            {item.source}
                            {hostBits ? ` · ${hostBits}` : ""}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-[var(--faint)]">
                            {formatRelativePlayed(item.endedAt)}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm tabular-nums">
                          {formatSessionDuration(item.durationSecs)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          {total > pageSize ? (
            <p className="mt-2 font-mono text-[11px] text-[var(--faint)]">
              Showing {items.length} of {total.toLocaleString()}
            </p>
          ) : null}
        </section>
      ) : null}
    </ResourceStatus>
  );
};
