"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { MusicRecentListen } from "@questorylabs/shared";
import { MusicChip } from "@/components/music/MusicChip";
import { MusicCover } from "@/components/music/MusicCover";
import { EmptyState, PageHeader, StateMessage } from "@/components/ui";
import { formatListenDateTime, musicFetch } from "@/lib/music";

export default function MusicListeningPage() {
  const recent = useQuery({
    queryKey: ["music-recent"],
    queryFn: () =>
      musicFetch<MusicRecentListen[]>("/analytics/recent?limit=50"),
  });

  return (
    <>
      <PageHeader title="Listening" description="Recent scrobbles." />

      {recent.isLoading && (
        <StateMessage variant="loading">Loading…</StateMessage>
      )}
      {recent.data && recent.data.length === 0 && (
        <EmptyState
          title="No listens yet"
          description="Configure multi-scrobbler or import history under Sources."
        />
      )}
      {recent.data && recent.data.length > 0 && (
        <ul className="divide-y divide-[var(--line)]">
          {recent.data.map((row) => (
            <li key={row.id} className="flex items-start gap-3 py-3">
              <MusicCover src={row.track.imageUrl} alt="" size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-[var(--ink)]">
                  <Link
                    href={`/music/tracks/${row.track.id}`}
                    className="hover:text-[var(--accent)]"
                  >
                    {row.track.title}
                  </Link>
                  <span className="text-[var(--muted)]"> · </span>
                  {row.track.artistId ? (
                    <Link
                      href={`/music/artists/${row.track.artistId}`}
                      className="text-[var(--muted)] hover:text-[var(--accent)]"
                    >
                      {row.track.artistName}
                    </Link>
                  ) : (
                    <span className="text-[var(--muted)]">
                      {row.track.artistName}
                    </span>
                  )}
                </div>
                {row.track.releaseTitle ? (
                  <div className="mt-0.5 truncate text-xs text-[var(--faint)]">
                    {row.track.releaseId ? (
                      <Link
                        href={`/music/albums/${row.track.releaseId}`}
                        className="hover:text-[var(--accent)]"
                      >
                        {row.track.releaseTitle}
                      </Link>
                    ) : (
                      row.track.releaseTitle
                    )}
                  </div>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] text-[var(--faint)]">
                    {formatListenDateTime(row.listenedAt)}
                  </span>
                  {row.musicService ? (
                    <MusicChip>{row.musicService}</MusicChip>
                  ) : null}
                  {row.mediaPlayer ? (
                    <MusicChip>{row.mediaPlayer}</MusicChip>
                  ) : null}
                  {row.track.genres.slice(0, 2).map((g) => (
                    <MusicChip key={g}>{g}</MusicChip>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
