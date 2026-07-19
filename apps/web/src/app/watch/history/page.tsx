"use client";

import { useQuery } from "@tanstack/react-query";
import type { WatchRecentEvent } from "@questorylabs/shared";
import { WatchGate } from "@/components/WatchGate";
import { EmptyState, PageHeader, StateMessage } from "@/components/ui";
import { watchFetch } from "@/lib/watch";

export default function WatchHistoryPage() {
  const recent = useQuery({
    queryKey: ["watch-recent"],
    queryFn: () => watchFetch<WatchRecentEvent[]>("/analytics/recent?limit=60"),
  });

  return (
    <WatchGate>
      <PageHeader
        title="History"
        description="Recent watch events across all connected sources."
      />

      {recent.isLoading && (
        <StateMessage variant="loading">Loading…</StateMessage>
      )}
      {!recent.isLoading && (recent.data || []).length === 0 && (
        <EmptyState
          title="No watch events yet"
          description="Connect a source under Watch → Sources to start ingesting."
        />
      )}
      {recent.data && recent.data.length > 0 && (
        <ul className="space-y-3">
          {recent.data.map((e) => (
            <li
              key={e.id}
              className="border-b border-[var(--line)] pb-3 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[var(--ink)]">
                  {e.title.name}
                  {e.episode
                    ? ` · S${e.episode.seasonNumber}E${e.episode.episodeNumber}`
                    : ""}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                  {e.source} · {e.precision}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                {new Date(e.watchedAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </WatchGate>
  );
}
