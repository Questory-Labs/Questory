"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { MusicArtistDetail } from "@questorylabs/shared";
import { MusicChip } from "@/components/music/MusicChip";
import { MusicCover } from "@/components/music/MusicCover";
import { PageHeader, Panel, StateMessage } from "@/components/ui";
import { formatListenDate, musicFetch } from "@/lib/music";

export default function MusicArtistPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const detail = useQuery({
    queryKey: ["music-artist", id],
    queryFn: () =>
      musicFetch<MusicArtistDetail>(`/analytics/artists/${id}`),
    enabled: Boolean(id),
  });

  const a = detail.data?.artist;

  return (
    <>
      <PageHeader
        eyebrow="Artist"
        title={a?.name || "Artist"}
        description={
          detail.data
            ? `${detail.data.listenCount} listens · first ${formatListenDate(detail.data.firstListenAt)} · latest ${formatListenDate(detail.data.latestListenAt)}`
            : undefined
        }
      />

      {detail.isLoading && (
        <StateMessage variant="loading">Loading artist…</StateMessage>
      )}
      {detail.isError && (
        <StateMessage variant="error">Artist not found.</StateMessage>
      )}

      {detail.data && a && (
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <MusicCover src={a.imageUrl} alt={a.name} size="lg" />
          <div>
            {a.genres.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {a.genres.map((g) => (
                  <MusicChip key={g}>{g}</MusicChip>
                ))}
              </div>
            ) : null}

            <section className="mt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                Top tracks
              </h2>
              <ol className="mt-3 space-y-2">
                {detail.data.topTracks.map((t, i) => (
                  <li key={t.id}>
                    <Link
                      href={`/music/tracks/${t.id}`}
                      className="flex items-center gap-3 border-b border-[var(--line)] py-2 text-sm hover:bg-[var(--bg-1)]"
                    >
                      <span className="w-5 font-mono text-[var(--faint)]">
                        {i + 1}.
                      </span>
                      <MusicCover src={t.imageUrl} alt="" size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[var(--ink)]">
                        {t.title}
                        {t.releaseTitle ? (
                          <span className="text-[var(--muted)]">
                            {" "}
                            · {t.releaseTitle}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--faint)]">
                        {t.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              {detail.data.topTracks.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  No listens for this artist yet.
                </p>
              ) : null}
            </section>

            <Panel
              wrapperClassName="mt-6"
              className="p-4 text-sm text-[var(--muted)]"
            >
              <Link href="/music/charts?kind=artists" className="hover:text-[var(--accent)]">
                ← Back to charts
              </Link>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
