"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReadRecentPage } from "@questorylabs/shared";
import { Button, EmptyState, PageHeader, StateMessage } from "@/components/ui";
import { readFetch } from "@/lib/read";

const PAGE_SIZE = 40;

export default function ReadHistoryPage() {
  const [page, setPage] = useState(1);
  const recent = useQuery({
    queryKey: ["read-recent", page],
    queryFn: () =>
      readFetch<ReadRecentPage>(
        `/analytics/recent?page=${page}&pageSize=${PAGE_SIZE}`,
      ),
  });

  const totalPages = recent.data
    ? Math.max(1, Math.ceil(recent.data.total / recent.data.pageSize))
    : 1;

  return (
    <>
      <PageHeader
        title="History"
        description="Reading progress events across connected sources."
      />

      {recent.isLoading && (
        <StateMessage variant="loading">Loading…</StateMessage>
      )}
      {!recent.isLoading && (recent.data?.items.length ?? 0) === 0 && (
        <EmptyState
          title="No reading events yet"
          description="Connect AniList under Read → Sources to start syncing."
        />
      )}
      {recent.data && recent.data.items.length > 0 && (
        <>
          <ul className="space-y-3">
            {recent.data.items.map((e) => (
              <li
                key={e.id}
                className="border-b border-[var(--line)] pb-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[var(--ink)]">
                    {e.title.name}
                    {e.chaptersRead != null
                      ? ` · Ch. ${e.chaptersRead}`
                      : ""}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                    {e.source} · {e.title.format}
                    {e.status ? ` · ${e.status}` : ""}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {new Date(e.readAt).toLocaleString()}
                  {e.progress > 0 ? ` · ${e.progress}%` : ""}
                </p>
              </li>
            ))}
          </ul>

          {recent.data.total > recent.data.pageSize && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                disabled={page <= 1 || recent.isFetching}
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
                disabled={page >= totalPages || recent.isFetching}
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
