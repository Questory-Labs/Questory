"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MusicRecentPage } from "@questorylabs/shared";
import { MusicChip } from "@/components/music/MusicChip";
import { MusicCover } from "@/components/music/MusicCover";
import {
  Button,
  EmptyState,
  OverflowMarquee,
  PageHeader,
  Panel,
  StateMessage,
} from "@/components/ui";
import { useMusicPlayingNow } from "@/hooks/useMusicPlayingNow";
import {
  formatListenRowTime,
  groupListensByDay,
  musicFetch,
} from "@/lib/music";

const PAGE_SIZE = 50;

export default function MusicListeningPage() {
  const [page, setPage] = useState(1);
  const recent = useQuery({
    queryKey: ["music-recent", page],
    queryFn: () =>
      musicFetch<MusicRecentPage>(
        `/analytics/recent?page=${page}&pageSize=${PAGE_SIZE}`,
      ),
  });
  const playing = useMusicPlayingNow();

  const total = recent.data?.total ?? 0;
  const pageSize = recent.data?.pageSize ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = recent.data?.items ?? [];
  const dayGroups = groupListensByDay(items);
  const nowPlaying = playing.data?.track ?? null;

  return (
    <>
      <PageHeader
        title="Listening"
        description={
          total > 0 ? `${total.toLocaleString()} scrobbles` : "Recent scrobbles."
        }
      />

      {nowPlaying ? (
        <Panel wrapperClassName="mb-6" className="flex items-center gap-4 p-4">
          <MusicCover src={nowPlaying.imageUrl} alt="" size="md" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Now playing
            </p>
            <OverflowMarquee className="mt-1 text-[var(--ink)]">
              <Link
                href={`/music/tracks/${nowPlaying.id}`}
                className="hover:text-[var(--accent)]"
              >
                {nowPlaying.title}
              </Link>
            </OverflowMarquee>
            <Link
              href={`/music/artists/${nowPlaying.artistId}`}
              className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
            >
              {nowPlaying.artistName}
            </Link>
          </div>
        </Panel>
      ) : null}

      {recent.isLoading && (
        <StateMessage variant="loading">Loading…</StateMessage>
      )}
      {!recent.isLoading && items.length === 0 && (
        <EmptyState
          title={nowPlaying ? "Waiting for first scrobble" : "No listens yet"}
          description={
            nowPlaying
              ? "Now playing is live. Completed listens appear here once multi-scrobbler submits them (usually when the track ends)."
              : "Configure multi-scrobbler or import history under Sources."
          }
        />
      )}
      {dayGroups.length > 0 && (
        <>
          <div className="space-y-6">
            {dayGroups.map((group) => (
              <section key={group.dayKey}>
                <h2 className="mb-1 border-b border-[var(--line)] pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                  {group.label}
                </h2>
                <ul className="divide-y divide-[var(--line)]">
                  {group.items.map((row) => (
                    <li key={row.id} className="flex items-start gap-3 py-3">
                      <MusicCover src={row.track.imageUrl} alt="" size="sm" />
                      <div className="min-w-0 flex-1">
                        <OverflowMarquee className="text-sm text-[var(--ink)]">
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
                        </OverflowMarquee>
                        {row.track.releaseTitle ? (
                          <OverflowMarquee className="mt-0.5 text-xs text-[var(--faint)]">
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
                          </OverflowMarquee>
                        ) : null}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[11px] text-[var(--faint)]">
                            {formatListenRowTime(row.listenedAt)}
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
              </section>
            ))}
          </div>

          {total > pageSize && (
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
