"use client";

import { useQuery } from "@tanstack/react-query";
import type { MusicTopItem } from "@questorylabs/shared";
import { MusicGate } from "@/components/MusicGate";
import { musicFetch } from "@/lib/music";

function TopList({
  title,
  kind,
}: {
  title: string;
  kind: "artists" | "tracks" | "genres";
}) {
  const q = useQuery({
    queryKey: ["music-tops", kind],
    queryFn: () =>
      musicFetch<MusicTopItem[]>(`/analytics/tops/${kind}?range=week&limit=15`),
  });

  return (
    <section>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
        {title}
      </h2>
      {q.isLoading && (
        <p className="mt-2 text-sm text-[var(--muted)]">Loading…</p>
      )}
      <ol className="mt-3 space-y-1.5">
        {(q.data || []).map((item, i) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="text-[var(--ink)]">
              <span className="font-mono text-[var(--faint)]">{i + 1}. </span>
              {item.name || item.title}
              {item.artistName ? (
                <span className="text-[var(--muted)]"> · {item.artistName}</span>
              ) : null}
            </span>
            <span className="font-mono text-[11px] text-[var(--faint)]">
              {item.count}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function MusicChartsPage() {
  return (
    <MusicGate>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl text-[var(--ink)]">Top charts</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Last 7 days.</p>
        <div className="mt-8 grid gap-10 sm:grid-cols-3">
          <TopList title="Artists" kind="artists" />
          <TopList title="Tracks" kind="tracks" />
          <TopList title="Genres" kind="genres" />
        </div>
      </div>
    </MusicGate>
  );
}
