"use client";

import { useQuery } from "@tanstack/react-query";
import type { MusicRecentListen } from "@questorylabs/shared";
import { MusicGate } from "@/components/MusicGate";
import { musicFetch } from "@/lib/music";

export default function MusicListeningPage() {
  const recent = useQuery({
    queryKey: ["music-recent"],
    queryFn: () => musicFetch<MusicRecentListen[]>("/analytics/recent?limit=50"),
  });

  return (
    <MusicGate>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl text-[var(--ink)]">Listening</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Recent scrobbles.</p>

        {recent.isLoading && (
          <p className="mt-8 text-sm text-[var(--muted)]">Loading…</p>
        )}
        {recent.data && (
          <ul className="mt-8 divide-y divide-[var(--line)]">
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
            {recent.data.length === 0 && (
              <li className="py-6 text-sm text-[var(--muted)]">
                No listens yet. Configure multi-scrobbler to submit to this
                service.
              </li>
            )}
          </ul>
        )}
      </div>
    </MusicGate>
  );
}
