"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { MusicCorrectionEdit } from "@/components/music/MusicCorrectionEdit";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import { MusicRecentListens } from "@/components/music/MusicRecentListens";
import { StatCard } from "@/components/StatCard";
import {
  OverflowMarquee,
  PageHeader,
  ResourceStatus,
  SkeletonDetailHeader,
  StateMessage,
} from "@/components/ui";
import { displayLabel } from "@/lib/display-label";
import { formatListenDateTime, formatMinutes } from "@/lib/music";
import { MUSIC_DETAIL_LISTENS_PAGE_SIZE } from "@/lib/pagination";
import type { MusicAlbumViewProps } from "./music.album.types";

export const MusicAlbumView = (props: Record<string, unknown>) => {
  const {
    id,
    range,
    onRangeChange,
    page,
    setPage,
    detail,
    listens,
    hourSeries,
    dowSeries,
    saveBusy,
    onSave,
  } = props as MusicAlbumViewProps;

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
  const listenItems = listens.value?.items ?? [];

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
            <MusicRangePicker
              value={range}
              onChange={onRangeChange}
              includeAll
            />
            {album ? (
              <MusicCorrectionEdit
                kind="album"
                entityId={id}
                saving={saveBusy}
                onSave={onSave}
              />
            ) : null}
          </>
        }
      />

      <ResourceStatus
        failed={detail.failed}
        empty={detail.empty}
        loading={<SkeletonDetailHeader />}
        error={<StateMessage variant="error">Album not found.</StateMessage>}
      >
        {detail.value && album ? (
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

              <MusicRecentListens
                total={total}
                itemCount={listenItems.length}
                empty={listens.empty}
                failed={listens.failed}
                refreshing={listens.refreshing}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
              >
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
              </MusicRecentListens>

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
        ) : null}
      </ResourceStatus>
    </>
  );
};
