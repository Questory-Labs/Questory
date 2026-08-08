"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@questorylabs/qhttp/react";
import type {
  MusicAlbumDetail,
  MusicAlbumListenPage,
  MusicRange,
  MusicTimeBucket,
} from "@questorylabs/shared";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { MusicCorrectionEdit } from "@/components/music/MusicCorrectionEdit";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import { StatCard } from "@/components/StatCard";
import {
  Button,
  OverflowMarquee,
  PageHeader,
  Panel,
  StateMessage,
  SkeletonDetailHeader,
} from "@/components/ui";
import { withTz } from "@/lib/dates";
import { formatListenDateTime, formatMinutes, musicFetch } from "@/lib/music";
import { MUSIC_DETAIL_LISTENS_PAGE_SIZE } from "@/lib/pagination";

function displayLabel(
  userDisplayName: string | null | undefined,
  title: string,
): string {
  return userDisplayName?.trim() || title;
}

export default function MusicAlbumPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const [range, setRange] = useState<MusicRange>("all");
  const [page, setPage] = useState(1);

  const detail = useQuery({
    queryKey: ["music-album", id, range],
    queryFn: () =>
      musicFetch<MusicAlbumDetail>(
        withTz(`/analytics/albums/${id}?range=${range}`),
      ),
    enabled: Boolean(id),
  });

  const listens = useQuery({
    queryKey: ["music-album-listens", id, range, page],
    queryFn: () =>
      musicFetch<MusicAlbumListenPage>(
        `/analytics/albums/${id}/listens?range=${range}&page=${page}&pageSize=${MUSIC_DETAIL_LISTENS_PAGE_SIZE}`,
      ),
    enabled: Boolean(id),
  });

  const hourSeries = useQuery({
    queryKey: ["music-album-hour", id, range],
    queryFn: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/albums/${id}/timeseries?granularity=hourOfDay&range=${range}`,
        ),
      ),
    enabled: Boolean(id),
  });

  const dowSeries = useQuery({
    queryKey: ["music-album-dow", id, range],
    queryFn: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/albums/${id}/timeseries?granularity=dayOfWeek&range=${range}`,
        ),
      ),
    enabled: Boolean(id),
  });

  const save = useMutation({
    mutationFn: (values: {
      albumTitle?: string | null;
      artists?: Array<{ id?: string; name: string }>;
      displayName?: string | null;
    }) =>
      musicFetch(`/corrections/albums/${id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-album", id] });
      qc.invalidateQueries({ queryKey: ["music-recent"] });
    },
  });

  const album = detail.data?.album;
  const title = album ? displayLabel(album.userDisplayName, album.title) : "Album";

  const hourData = useMemo(
    () =>
      (hourSeries.data || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [hourSeries.data],
  );
  const dowData = useMemo(
    () =>
      (dowSeries.data || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [dowSeries.data],
  );

  const total = listens.data?.total ?? 0;
  const pageSize = listens.data?.pageSize ?? MUSIC_DETAIL_LISTENS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const listenItems = listens.data?.items ?? [];

  const handleRangeChange = (next: MusicRange) => {
    setRange(next);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        eyebrow="Album"
        title={title}
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
            </>
          ) : undefined
        }
        actions={
          <>
            <MusicRangePicker value={range} onChange={handleRangeChange} />
            {album ? (
              <MusicCorrectionEdit
                kind="album"
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
        <StateMessage variant="error">Album not found.</StateMessage>
      )}

      {detail.data && album && (
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <MusicCover src={album.imageUrl} alt={title} size="lg" />
          <section>
            {album.userDisplayName && album.userDisplayName !== album.title ? (
              <p className="mb-4 text-sm text-[var(--muted)]">{album.title}</p>
            ) : null}

            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Listens" value={detail.data.listenCount} />
              <StatCard
                label="Listening time"
                value={
                  detail.data.listeningMinutes > 0
                    ? formatMinutes(detail.data.listeningMinutes)
                    : "—"
                }
                hint="Estimated from track lengths"
              />
              {detail.data.peakDow ? (
                <StatCard
                  label="Peak day"
                  value={detail.data.peakDow.label}
                  hint={`${detail.data.peakDow.count} listens`}
                />
              ) : null}
              {detail.data.peakHour ? (
                <StatCard
                  label="Peak hour"
                  value={detail.data.peakHour.label}
                  hint={`${detail.data.peakHour.count} listens`}
                />
              ) : null}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <SketchChartPanel
                title="Day of week"
                data={dowData}
                valueLabel="listens"
                emptyMessage="No listens in this range."
              />
              <SketchChartPanel
                title="Hour of day"
                data={hourData}
                valueLabel="listens"
                emptyMessage="No listens in this range."
              />
            </div>

            <h2 className="mt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Top tracks
            </h2>
            <ol className="mt-3 space-y-1">
              {detail.data.topTracks.map((t, i) => (
                <li key={t.id}>
                  <Link
                    href={`/music/tracks/${t.id}`}
                    className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-2 text-sm hover:bg-[var(--bg-1)]"
                  >
                    <span className="mr-2 shrink-0 font-mono text-[var(--faint)]">
                      {i + 1}.
                    </span>
                    <OverflowMarquee className="min-w-0 flex-1 text-[var(--ink)]">
                      {t.title}
                    </OverflowMarquee>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--faint)]">
                      {t.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            {detail.data.topTracks.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                No listens in this range.
              </p>
            ) : null}

            <h2 className="mt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Top moods
            </h2>
            {detail.data.topMoods.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {detail.data.topMoods.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between border-b border-[var(--line)] py-2 text-sm"
                  >
                    <span>{m.name}</span>
                    <span className="font-mono text-[11px] text-[var(--faint)]">
                      {m.count}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                No mood tags in this range.
              </p>
            )}

            <section className="mt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                Recent listens
                {total > 0 ? ` · ${total.toLocaleString()}` : ""}
              </h2>
              <ul className="mt-3 divide-y divide-[var(--line)]">
                {listenItems.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-baseline justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-[12px] text-[var(--muted)]">
                        {formatListenDateTime(row.listenedAt)}
                      </span>
                      <span className="mx-2 text-[var(--faint)]">·</span>
                      <Link
                        href={`/music/tracks/${row.track.id}`}
                        className="text-sm text-[var(--ink)] hover:text-[var(--accent)]"
                      >
                        {row.track.title}
                      </Link>
                    </div>
                    {row.musicService || row.mediaPlayer ? (
                      <span className="shrink-0 font-mono text-[10px] text-[var(--faint)]">
                        {[row.musicService, row.mediaPlayer]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {listens.isLoading && listenItems.length === 0 ? (
                <StateMessage variant="loading" className="mt-3" />
              ) : null}
              {!listens.isLoading && listenItems.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  No listens in this range.
                </p>
              ) : null}

              {total > pageSize ? (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button
                    variant="secondary"
                    disabled={page <= 1 || listens.isFetching}
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
                    disabled={page >= totalPages || listens.isFetching}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5"
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </section>

            <p className="mt-8 text-sm text-[var(--muted)]">
              <Link
                href="/music/charts?kind=albums"
                className="hover:text-[var(--accent)]"
              >
                ← Back to album charts
              </Link>
            </p>
          </section>
        </div>
      )}
    </>
  );
}
