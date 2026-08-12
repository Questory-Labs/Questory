"use client";

import Link from "next/link";
import { useState } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import type { PlaySessionItem, PlaySessionPage } from "@questorylabs/shared";
import {
  Button,
  EmptyState,
  PageHeader,
  SkeletonListRows,
} from "@/components/ui";
import { api } from "@/lib/api";
import {
  formatRowTime,
  groupByLocalDay,
} from "@/lib/dates";
import { PLAY_SESSIONS_PAGE_SIZE } from "@/lib/pagination";

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

function SessionRow({ item }: { item: PlaySessionItem }) {
  const title = item.game?.name ?? item.title;
  const thumb = item.game?.headerImage ?? null;
  const hostBits = [item.hostName, item.hostOs].filter(Boolean).join(" · ");

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="h-10 w-[5.4rem] shrink-0 overflow-hidden bg-[var(--bg-2)]">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center hatch-fill text-[10px] text-[var(--faint)]">
            —
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {item.gameId ? (
            <Link
              href={`/library/${item.gameId}`}
              className="text-sm text-[var(--ink)] hover:text-[var(--accent)]"
            >
              {title}
            </Link>
          ) : (
            <span className="text-sm text-[var(--ink)]">{title}</span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
            {formatRowTime(item.endedAt)}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-[var(--muted)]">
          {formatDuration(item.durationSecs)}
          {item.source ? ` · ${item.source}` : ""}
          {hostBits ? ` · ${hostBits}` : ""}
        </p>
      </div>
    </li>
  );
}

export default function SessionsPage() {
  const [page, setPage] = useState(1);
  const sessions = useResource({
    id: ["play-sessions", page],
    load: () =>
      api<PlaySessionPage>(
        `/play-sessions?page=${page}&pageSize=${PLAY_SESSIONS_PAGE_SIZE}`,
      ),
  });

  const total = sessions.value?.total ?? 0;
  const pageSize = sessions.value?.pageSize ?? PLAY_SESSIONS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = sessions.value?.items ?? [];
  const dayGroups = groupByLocalDay(items, (s) => s.endedAt);

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

      {sessions.empty && <SkeletonListRows />}
      {!sessions.empty && items.length === 0 && (
        <EmptyState
          title="No sessions yet"
          description="Install qMonitor, authorize it against this account, and finish a game session — completed plays show up here."
        />
      )}
      {dayGroups.length > 0 && (
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
      )}
    </>
  );
}
