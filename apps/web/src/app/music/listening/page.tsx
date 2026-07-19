"use client";

import { useQuery } from "@tanstack/react-query";
import type { MusicRecentListen } from "@questorylabs/shared";
import { MusicGate } from "@/components/MusicGate";
import { EmptyState, PageHeader, StateMessage } from "@/components/ui";
import { musicFetch } from "@/lib/music";

export default function MusicListeningPage() {
  const recent = useQuery({
    queryKey: ["music-recent"],
    queryFn: () => musicFetch<MusicRecentListen[]>("/analytics/recent?limit=50"),
  });

  return (
    <MusicGate>
      <PageHeader title="Listening" description="Recent scrobbles." />

      {recent.isLoading && (
        <StateMessage variant="loading">Loading…</StateMessage>
      )}
      {recent.data && recent.data.length === 0 && (
        <EmptyState
          title="No listens yet"
          description="Configure multi-scrobbler to submit to this service."
        />
      )}
      {recent.data && recent.data.length > 0 && (
        <ul className="divide-y divide-[var(--line)]">
          {recent.data.map((row) => (
            <li key={row.id} className="py-3">
              <div className="text-sm text-[var(--ink)]">
                {row.track.title}
                <span className="text-[var(--muted)]">
                  {" "}
                  · {row.track.artistName}
                </span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-[var(--faint)]">
                {new Date(row.listenedAt).toLocaleString()}
                {row.track.genres.length > 0
                  ? ` · ${row.track.genres.slice(0, 3).join(", ")}`
                  : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </MusicGate>
  );
}
