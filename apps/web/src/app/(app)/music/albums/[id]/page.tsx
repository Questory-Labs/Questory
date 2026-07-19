"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { MusicAlbumDetail } from "@questorylabs/shared";
import { MusicCover } from "@/components/music/MusicCover";
import { PageHeader, Panel, StateMessage } from "@/components/ui";
import { formatListenDate, musicFetch } from "@/lib/music";

export default function MusicAlbumPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const detail = useQuery({
    queryKey: ["music-album", id],
    queryFn: () => musicFetch<MusicAlbumDetail>(`/analytics/albums/${id}`),
    enabled: Boolean(id),
  });

  const album = detail.data?.album;

  return (
    <>
      <PageHeader
        eyebrow="Album"
        title={album?.title || "Album"}
        description={
          album ? (
            <>
              {album.artistId && album.artistName ? (
                <Link
                  href={`/music/artists/${album.artistId}`}
                  className="hover:text-[var(--accent)]"
                >
                  {album.artistName}
                </Link>
              ) : (
                album.artistName || "Unknown artist"
              )}
              {album.year ? ` · ${album.year}` : null}
              {detail.data
                ? ` · ${detail.data.listenCount} listens · first ${formatListenDate(detail.data.firstListenAt)}`
                : null}
            </>
          ) : undefined
        }
      />

      {detail.isLoading && (
        <StateMessage variant="loading">Loading album…</StateMessage>
      )}
      {detail.isError && (
        <StateMessage variant="error">Album not found.</StateMessage>
      )}

      {detail.data && album && (
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <MusicCover src={album.imageUrl} alt={album.title} size="lg" />
          <section>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Tracks you’ve played
            </h2>
            <ol className="mt-3 space-y-1">
              {detail.data.topTracks.map((t, i) => (
                <li key={t.id}>
                  <Link
                    href={`/music/tracks/${t.id}`}
                    className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-2 text-sm hover:bg-[var(--bg-1)]"
                  >
                    <span className="min-w-0 truncate text-[var(--ink)]">
                      <span className="mr-2 font-mono text-[var(--faint)]">
                        {i + 1}.
                      </span>
                      {t.title}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--faint)]">
                      {t.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            {detail.data.topTracks.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                No listens for this album yet.
              </p>
            ) : null}

            <Panel
              wrapperClassName="mt-6"
              className="p-4 text-sm text-[var(--muted)]"
            >
              <Link
                href="/music/charts?kind=albums"
                className="hover:text-[var(--accent)]"
              >
                ← Back to album charts
              </Link>
            </Panel>
          </section>
        </div>
      )}
    </>
  );
}
