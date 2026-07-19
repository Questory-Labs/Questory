"use client";

import { useQuery } from "@tanstack/react-query";
import type { MusicOverview } from "@questorylabs/shared";
import { MusicGate } from "@/components/MusicGate";
import { PageHeader, Panel, StateMessage } from "@/components/ui";
import { musicFetch } from "@/lib/music";

export default function MusicHomePage() {
  const overview = useQuery({
    queryKey: ["music-overview"],
    queryFn: () => musicFetch<MusicOverview>("/analytics/overview"),
  });

  return (
    <MusicGate>
      <PageHeader
        title="Music"
        description="Listening analytics from multi-scrobbler. Point MS at this music service's ListenBrainz endpoint to start ingesting scrobbles."
      />

      {overview.isLoading && (
        <StateMessage variant="loading">Loading overview…</StateMessage>
      )}
      {overview.isError && (
        <StateMessage variant="error">
          Could not load music analytics.
        </StateMessage>
      )}
      {overview.data && (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            ["Listens", overview.data.totalListens],
            ["Artists", overview.data.uniqueArtists],
            ["Tracks", overview.data.uniqueTracks],
            ["Streak (days)", overview.data.streakDays],
          ].map(([label, value]) => (
            <Panel key={String(label)} className="p-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                {label}
              </dt>
              <dd className="mt-1 text-2xl text-[var(--ink)]">{value}</dd>
            </Panel>
          ))}
        </dl>
      )}
    </MusicGate>
  );
}
