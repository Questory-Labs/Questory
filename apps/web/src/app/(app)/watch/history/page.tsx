"use client";

import Link from "next/link";
import { useState } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import type { WatchRecentPage } from "@questorylabs/shared";
import { Button, EmptyState, PageHeader, SkeletonListRows } from "@/components/ui";
import { WatchAddButton } from "@/components/watch/WatchAddButton";
import { formatDateTime } from "@/lib/dates";
import { MEDIA_HISTORY_PAGE_SIZE } from "@/lib/pagination";
import { formatYourWatchRating, watchFetch } from "@/lib/watch";

export default function WatchHistoryPage() {
  const [page, setPage] = useState(1);
  const recent = useResource({
    id: ["watch-recent", page],
    load: () =>
      watchFetch<WatchRecentPage>(
        `/analytics/recent?page=${page}&pageSize=${MEDIA_HISTORY_PAGE_SIZE}`,
      ),
  });

  const totalPages = recent.value
    ? Math.max(1, Math.ceil(recent.value.total / recent.value.pageSize))
    : 1;

  return (
    <>
      <PageHeader
        title="History"
        description="Watch events across all connected sources."
        actions={<WatchAddButton />}
      />

      {recent.empty && <SkeletonListRows />}
      {!recent.empty && (recent.value?.items.length ?? 0) === 0 && (
        <EmptyState
          title="No watch events yet"
          description="Add a watch, or connect a source under Watch → Sources to start ingesting."
        />
      )}
      {recent.value && recent.value.items.length > 0 && (
        <>
          <ul className="space-y-3">
            {recent.value.items.map((e) => (
              <li
                key={e.id}
                className="border-b border-[var(--line)] pb-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/watch/titles/${e.title.id}`}
                    className="text-[var(--ink)] hover:text-[var(--accent)]"
                  >
                    {e.title.name}
                    {e.episode
                      ? ` · S${e.episode.seasonNumber}E${e.episode.episodeNumber}`
                      : ""}
                  </Link>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                    {e.source} · {e.precision}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {formatDateTime(e.watchedAt)}
                  {e.rating != null
                    ? ` · ${formatYourWatchRating(e.rating)}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>

          {recent.value.total > recent.value.pageSize && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                disabled={page <= 1 || recent.refreshing}
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
                disabled={page >= totalPages || recent.refreshing}
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
