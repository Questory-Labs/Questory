"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { MusicTrackDetail } from "@questorylabs/shared";
import { MusicChip } from "@/components/music/MusicChip";
import { MusicCover } from "@/components/music/MusicCover";
import { StatCard } from "@/components/StatCard";
import { PageHeader, Panel, StateMessage } from "@/components/ui";
import { formatListenDate, formatListenDateTime, musicFetch } from "@/lib/music";

function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function MusicTrackPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const detail = useQuery({
    queryKey: ["music-track", id],
    queryFn: () => musicFetch<MusicTrackDetail>(`/analytics/tracks/${id}`),
    enabled: Boolean(id),
  });

  const t = detail.data?.track;

  return (
    <>
      <PageHeader
        eyebrow="Track"
        title={t?.title || "Track"}
        description={
          t ? (
            <>
              <Link
                href={`/music/artists/${t.artistId}`}
                className="hover:text-[var(--accent)]"
              >
                {t.artistName}
              </Link>
              {t.releaseTitle ? (
                <>
                  {" · "}
                  {t.releaseId ? (
                    <Link
                      href={`/music/albums/${t.releaseId}`}
                      className="hover:text-[var(--accent)]"
                    >
                      {t.releaseTitle}
                    </Link>
                  ) : (
                    t.releaseTitle
                  )}
                </>
              ) : null}
            </>
          ) : undefined
        }
      />

      {detail.isLoading && (
        <StateMessage variant="loading">Loading track…</StateMessage>
      )}
      {detail.isError && (
        <StateMessage variant="error">Track not found.</StateMessage>
      )}

      {detail.data && t && (
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <MusicCover src={t.imageUrl} alt={t.title} size="lg" />
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Listens" value={detail.data.listenCount} />
              <StatCard label="Duration" value={formatDuration(t.durationMs)} />
              <StatCard
                label="First"
                value={formatListenDate(detail.data.firstListenAt)}
              />
              <StatCard
                label="Latest"
                value={formatListenDate(detail.data.latestListenAt)}
              />
            </div>

            {t.genres.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.genres.map((g) => (
                  <MusicChip key={`${g.name}-${g.source}`}>
                    {g.name}
                  </MusicChip>
                ))}
              </div>
            ) : null}

            <section className="mt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                Recent listens
              </h2>
              <ul className="mt-3 divide-y divide-[var(--line)]">
                {detail.data.recentListens.map((iso) => (
                  <li
                    key={iso}
                    className="py-2 font-mono text-[12px] text-[var(--muted)]"
                  >
                    {formatListenDateTime(iso)}
                  </li>
                ))}
              </ul>
            </section>

            <Panel
              wrapperClassName="mt-6"
              className="p-4 text-sm text-[var(--muted)]"
            >
              <Link
                href="/music/listening"
                className="hover:text-[var(--accent)]"
              >
                ← Back to listening
              </Link>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
