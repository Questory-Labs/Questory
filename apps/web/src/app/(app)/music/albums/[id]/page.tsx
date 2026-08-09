"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
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
  const store = useStore();
  const [range, setRange] = useState<MusicRange>("all");
  const [page, setPage] = useState(1);

  const detail = useResource({
    id: ["music-album", id, range],
    load: () =>
      musicFetch<MusicAlbumDetail>(
        withTz(`/analytics/albums/${id}?range=${range}`),
      ),
    when: Boolean(id),
  });

  const listens = useResource({
    id: ["music-album-listens", id, range, page],
    load: () =>
      musicFetch<MusicAlbumListenPage>(
        `/analytics/albums/${id}/listens?range=${range}&page=${page}&pageSize=${MUSIC_DETAIL_LISTENS_PAGE_SIZE}`,
      ),
    when: Boolean(id),
  });

  const hourSeries = useResource({
    id: ["music-album-hour", id, range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/albums/${id}/timeseries?granularity=hourOfDay&range=${range}`,
        ),
      ),
    when: Boolean(id),
  });

  const dowSeries = useResource({
    id: ["music-album-dow", id, range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/albums/${id}/timeseries?granularity=dayOfWeek&range=${range}`,
        ),
      ),
    when: Boolean(id),
  });

  const save = useAction({
    run: (values: {
      albumTitle?: string | null;
      artists?: Array<{ id?: string; name: string }>;
      displayName?: string | null;
    }) =>
      musicFetch(`/corrections/albums/${id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      store.touch(["music-album", id]);
      store.touch(["music-recent"]);
    },
  });

  const album = detail.value?.album;
  const title = album ? displayLabel(album.userDisplayName, album.title) : "Album";

  const hourData = useMemo(
    () =>
      (hourSeries.value || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [hourSeries.value],
  );
  const dowData = useMemo(
    () =>
      (dowSeries.value || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [dowSeries.value],
  );

  const total = listens.value?.total ?? 0;
  const pageSize = listens.value?.pageSize ?? MUSIC_DETAIL_LISTENS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const listenItems = listens.value?.items ?? [];

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
                saving={save.busy}
                onSave={async (values) => {
                  await save.submitAsync(values);
                }}
              />
            ) : null}
          </>
        }
      />

      {detail.empty && <SkeletonDetailHeader />}
      {detail.failed && (
        <StateMessage variant="error">Album not found.</StateMessage>
      )}

      {detail.value && album && (
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <MusicCover src={album.imageUrl} alt={title} size="lg" />
          <section>
            {album.userDisplayName && album.userDisplayName !== album.title ? (
              <p className="mb-4 text-sm text-[var(--muted)]">{album.title}</p>
            ) : null}

            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Listens" value={detail.value.listenCount} />
              <StatCard
                label="Listening time"
                value={
                  detail.value.listeningMinutes > 0
                    ? formatMinutes(detail.value.listeningMinutes)
                    : "—"
                }
                hint="Estimated from track lengths"
              />
              {detail.value.peakDow ? (
                <StatCard
                  label="Peak day"
                  value={detail.value.peakDow.label}
                  hint={`${detail.value.peakDow.count} listens`}
                />
              ) : null}
              {detail.value.peakHour ? (
                <StatCard
                  label="Peak hour"
                  value={detail.value.peakHour.label}
                  hint={`${detail.value.peakHour.count} listens`}
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
              {detail.value.topTracks.map((t, i) => (
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
            {detail.value.topTracks.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                No listens in this range.
              </p>
            ) : null}

            <h2 className="mt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Top moods
            </h2>
            {detail.value.topMoods.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {detail.value.topMoods.map((m) => (
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
              {listens.empty && listenItems.length === 0 ? (
                <StateMessage variant="loading" className="mt-3" />
              ) : null}
              {!listens.empty && listenItems.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  No listens in this range.
                </p>
              ) : null}

              {total > pageSize ? (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button
                    variant="secondary"
                    disabled={page <= 1 || listens.refreshing}
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
                    disabled={page >= totalPages || listens.refreshing}
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
