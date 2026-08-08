"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@questorylabs/qhttp/react";
import { useMemo, useState } from "react";
import type { MusicArtistDetail, MusicRange } from "@questorylabs/shared";
import { MusicCorrectionEdit } from "@/components/music/MusicCorrectionEdit";
import { MusicChip } from "@/components/music/MusicChip";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import { OverflowMarquee, PageHeader, SkeletonDetailHeader, StateMessage } from "@/components/ui";
import { formatListenDate, musicFetch } from "@/lib/music";

function displayLabel(
  userDisplayName: string | null | undefined,
  name: string,
): string {
  return userDisplayName?.trim() || name;
}

export default function MusicArtistPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const [range, setRange] = useState<MusicRange>("all");

  const detail = useQuery({
    queryKey: ["music-artist", id, range],
    queryFn: () =>
      musicFetch<MusicArtistDetail>(
        `/analytics/artists/${id}?range=${range}`,
      ),
    enabled: Boolean(id),
  });

  const save = useMutation({
    mutationFn: (values: {
      artists?: Array<{ id?: string; name: string }>;
      displayName?: string | null;
    }) =>
      musicFetch(`/corrections/artists/${id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-artist", id] });
      qc.invalidateQueries({ queryKey: ["music-recent"] });
    },
  });

  const a = detail.data?.artist;
  const title = a ? displayLabel(a.userDisplayName, a.name) : "Artist";

  const topTrackItems = useMemo(
    () =>
      detail.data?.topTracks.map((t) => ({
        key: t.id,
        href: `/music/tracks/${t.id}`,
        label: t.title,
        sub: t.releaseTitle,
        count: t.count,
        imageUrl: t.imageUrl,
      })) ?? [],
    [detail.data?.topTracks],
  );

  const topAlbumItems = useMemo(
    () =>
      detail.data?.topAlbums.map((t) => ({
        key: t.id,
        href: `/music/albums/${t.id}`,
        label: t.title,
        count: t.count,
        imageUrl: t.imageUrl,
      })) ?? [],
    [detail.data?.topAlbums],
  );

  return (
    <>
      <PageHeader
        eyebrow="Artist"
        title={title}
        description={
          detail.data
            ? `${detail.data.listenCount} listens in range · first ${formatListenDate(detail.data.firstListenAt)} · latest ${formatListenDate(detail.data.latestListenAt)}`
            : undefined
        }
        actions={
          <>
            <MusicRangePicker value={range} onChange={setRange} />
            {a ? (
              <MusicCorrectionEdit
                kind="artist"
                entityId={id}
                saving={save.isPending}
                onSave={async (values) => {
                  await save.mutateAsync(values);
                }}
              />
            ) : null}
          </>
        }
      />

      {detail.isLoading && !detail.data && <SkeletonDetailHeader />}
      {detail.isError && (
        <StateMessage variant="error">Artist not found.</StateMessage>
      )}

      {detail.data && a && (
        <>
          <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
            <MusicCover src={a.imageUrl} alt={title} size="lg" />
            <div>
              {a.userDisplayName && a.userDisplayName !== a.name ? (
                <p className="text-sm text-[var(--muted)]">{a.name}</p>
              ) : null}

              {a.genres.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {a.genres.map((g) => (
                    <MusicChip key={g}>{g}</MusicChip>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {detail.data.topMoods.length > 0 ? (
            <MoodTagCloud moods={detail.data.topMoods} />
          ) : null}

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <TopList
              title="Top songs"
              empty="No listens in this range."
              items={topTrackItems}
              moreHref="/music/charts?kind=tracks"
              moreLabel="View top tracks"
            />
            <TopList
              title="Top albums"
              empty="No album listens in this range."
              items={topAlbumItems}
              moreHref="/music/charts?kind=albums"
              moreLabel="View top albums"
            />
          </div>

          <p className="mt-8 text-sm text-[var(--muted)]">
            <Link
              href="/music/charts?kind=artists"
              className="hover:text-[var(--accent)]"
            >
              ← Back to charts
            </Link>
          </p>
        </>
      )}
    </>
  );
}

function MoodTagCloud({
  moods,
}: {
  moods: Array<{ id: string; name: string; count: number }>;
}) {
  const { min, max } = useMemo(() => {
    const counts = moods.map((m) => m.count);
    return {
      min: Math.min(...counts),
      max: Math.max(...counts),
    };
  }, [moods]);

  return (
    <section className="mt-8">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
        Moods
      </h2>
      <div className="mt-3 flex h-[250px] flex-wrap content-center items-center justify-center gap-x-3 gap-y-2 overflow-hidden rounded border border-[var(--line)] bg-[var(--bg-1)] px-4 py-3">
        {moods.map((m) => {
          const ratio = max === min ? 1 : (m.count - min) / (max - min);
          const fontSize = 0.75 + ratio * 1.1;
          const opacity = 0.55 + ratio * 0.45;
          return (
            <span
              key={m.id}
              title={`${m.count} listens`}
              className="font-display font-semibold leading-tight text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
              style={{ fontSize: `${fontSize}rem`, opacity }}
            >
              {m.name}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function TopList({
  title,
  empty,
  items,
  moreHref,
  moreLabel,
}: {
  title: string;
  empty: string;
  moreHref?: string;
  moreLabel?: string;
  items: Array<{
    key: string;
    href: string;
    label: string;
    sub?: string | null;
    count: number;
    imageUrl?: string | null;
  }>;
}) {
  return (
    <section>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
        {title}
      </h2>
      {items.length > 0 ? (
        <>
          <ol className="mt-3 space-y-2">
            {items.map((t, i) => (
              <li key={t.key}>
                <Link
                  href={t.href}
                  className="flex items-center gap-3 border-b border-[var(--line)] py-2 text-sm hover:bg-[var(--bg-1)]"
                >
                  <span className="w-5 font-mono text-[var(--faint)]">
                    {i + 1}.
                  </span>
                  <MusicCover src={t.imageUrl} alt="" size="sm" />
                  <OverflowMarquee className="flex-1 text-[var(--ink)]">
                    {t.label}
                    {t.sub ? (
                      <span className="text-[var(--muted)]"> · {t.sub}</span>
                    ) : null}
                  </OverflowMarquee>
                  <span className="font-mono text-[11px] text-[var(--faint)]">
                    {t.count}
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          {moreHref ? (
            <p className="mt-3 text-sm">
              <Link
                href={moreHref}
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--accent)]"
              >
                {moreLabel ?? "View all"} →
              </Link>
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">{empty}</p>
      )}
    </section>
  );
}
