"use client";

import { useQuery } from "@tanstack/react-query";
import type { WatchRecentEvent } from "@questorylabs/shared";
import { WatchGate } from "@/components/WatchGate";
import { watchFetch } from "@/lib/watch";

export default function WatchHistoryPage() {
  const recent = useQuery({
    queryKey: ["watch-recent"],
    queryFn: () => watchFetch<WatchRecentEvent[]>("/analytics/recent?limit=60"),
  });

  return (
    <WatchGate>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl text-[var(--ink)]">History</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Recent watch events across all connected sources.
        </p>

        {recent.isLoading && (
          <p className="mt-8 text-sm text-[var(--muted)]">Loading…</p>
        )}
        <ul className="mt-8 space-y-3">
          {(recent.data || []).map((e) => (
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
      </div>
    </WatchGate>
  );
}
