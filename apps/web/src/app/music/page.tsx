"use client";

import { useQuery } from "@tanstack/react-query";
import type { MusicOverview } from "@questorylabs/shared";
import { MusicGate } from "@/components/MusicGate";
import { musicFetch } from "@/lib/music";

export default function MusicHomePage() {
  const overview = useQuery({
    queryKey: ["music-overview"],
    queryFn: () => musicFetch<MusicOverview>("/analytics/overview"),
  });

  return (
    <MusicGate>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl text-[var(--ink)]">Music</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Listening analytics from multi-scrobbler. Point MS at this music
          service&apos;s ListenBrainz endpoint to start ingesting scrobbles.
        </p>

        {overview.isLoading && (
          <p className="mt-8 text-sm text-[var(--muted)]">Loading overview…</p>
        )}
        {overview.isError && (
          <p className="mt-8 text-sm text-red-400">
            Could not load music analytics.
          </p>
        )}
        {overview.data && (
          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              ["Listens", overview.data.totalListens],
              ["Artists", overview.data.uniqueArtists],
              ["Tracks", overview.data.uniqueTracks],
              ["Streak (days)", overview.data.streakDays],
            ].map(([label, value]) => (
              <div key={String(label)} className="border border-[var(--line)] p-4">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                  {label}
                </dt>
                <dd className="mt-1 text-2xl text-[var(--ink)]">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </MusicGate>
  );
}
