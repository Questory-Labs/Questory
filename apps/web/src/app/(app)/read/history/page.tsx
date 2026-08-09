"use client";

import Link from "next/link";
import { useState } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import type { ReadRecentPage } from "@questorylabs/shared";
import { Button, EmptyState, PageHeader, SkeletonListRows } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { MEDIA_HISTORY_PAGE_SIZE } from "@/lib/pagination";
import { readFetch } from "@/lib/read";

export default function ReadHistoryPage() {
  const [page, setPage] = useState(1);
  const recent = useResource({
    id: ["read-recent", page],
    load: () =>
      readFetch<ReadRecentPage>(
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
        description="Reading progress events across connected sources."
      />

      {recent.empty && <SkeletonListRows />}
      {!recent.empty && (recent.value?.items.length ?? 0) === 0 && (
        <EmptyState
          title="No reading events yet"
          description="Connect AniList under Read → Sources to start syncing."
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
                    href={`/read/titles/${e.title.id}`}
                    className="text-[var(--ink)] hover:text-[var(--accent)]"
                  >
                    {e.title.name}
                    {e.chaptersRead != null
                      ? ` · Ch. ${e.chaptersRead}`
                      : ""}
                  </Link>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                    {e.source} · {e.title.format}
                    {e.status ? ` · ${e.status}` : ""}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {formatDateTime(e.readAt)}
                  {e.progress > 0 ? ` · ${e.progress}%` : ""}
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
