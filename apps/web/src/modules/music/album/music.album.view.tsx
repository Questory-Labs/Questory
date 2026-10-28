"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CountUp } from "@questorylabs/ui";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { MusicCorrectionEdit } from "@/components/music/MusicCorrectionEdit";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import { MusicRecentListens } from "@/components/music/MusicRecentListens";
import {
  ResourceStatus,
  SkeletonDetailHeader,
  StateMessage,
} from "@/components/ui";
import { displayLabel } from "@/lib/display-label";
import { formatListenDateTime, formatMinutes } from "@/lib/music";
import { MUSIC_DETAIL_LISTENS_PAGE_SIZE } from "@/lib/pagination";
import { DetailHero } from "../components/DetailHero";
import { DetailKpiStrip } from "../components/DetailKpiStrip";
import { HourBars } from "../components/HourBars";
import { MusicBreadcrumb } from "../components/MusicBreadcrumb";
import { RankedBarList } from "../components/RankedBarList";
import { formatHours, initialOf } from "../music.utils";
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

  const d = detail.value;
  const album = d?.album;
  const title = album ? displayLabel(album.userDisplayName, album.title) : "Album";

  const dowData = useMemo(
    () =>
      (dowSeries.value || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [dowSeries.value],
  );
  const trackItems = useMemo(
    () =>
      (d?.topTracks ?? []).map((t) => ({
        key: t.id,
        href: `/music/tracks/${t.id}`,
        label: t.title,
        count: t.count,
      })),
    [d?.topTracks],
  );

  const total = listens.value?.total ?? 0;
  const pageSize = listens.value?.pageSize ?? MUSIC_DETAIL_LISTENS_PAGE_SIZE;
  const listenItems = listens.value?.items ?? [];

  return (
    <div className="flex flex-col gap-3.5">
      <MusicBreadcrumb href="/music/charts?kind=albums" label="Album charts" current={title} />

      <ResourceStatus
        failed={detail.failed}
        empty={detail.empty}
        loading={<SkeletonDetailHeader />}
        error={<StateMessage variant="error">Album not found.</StateMessage>}
      >
        {d && album ? (
          <div className="flex flex-col gap-3.5">
            <DetailHero
              eyebrow="Album"
              title={title}
              titleId="music-album-title"
              subtitle={
                <>
                  {album.artistId && album.artistName ? (
                    <Link
                      href={`/music/artists/${album.artistId}`}
                      className="hover:text-[var(--ink)]"
                    >
                      {album.artistName}
                    </Link>
                  ) : (
                    album.artistName || "Unknown artist"
                  )}
                  {album.year ? ` · ${album.year}` : null}
                  {album.userDisplayName && album.userDisplayName !== album.title ? (
                    <span className="block text-sm">{album.title}</span>
                  ) : null}
                </>
              }
              coverUrl={album.imageUrl}
              initial={initialOf(title)}
              moods={d.topMoods.map((m) => m.name)}
              stats={[
                { label: "Listens", value: <CountUp value={d.listenCount} /> },
                ...(d.listeningMinutes > 0
                  ? [{ label: "Hours", value: formatHours(d.listeningMinutes) }]
                  : []),
              ]}
              actions={
                <>
                  <MusicRangePicker value={range} onChange={onRangeChange} includeAll />
                  <MusicCorrectionEdit
                    kind="album"
                    entityId={id}
                    saving={saveBusy}
                    onSave={onSave}
                  />
                </>
              }
            />

            <DetailKpiStrip
              items={[
                {
                  label: "Listening time",
                  value: d.listeningMinutes > 0 ? formatMinutes(d.listeningMinutes) : "—",
                  hint: "Estimated from track lengths",
                },
                {
                  label: "Peak day",
                  value: d.peakDow?.label ?? "—",
                  hint: d.peakDow ? `${d.peakDow.count} listens` : undefined,
                },
                {
                  label: "Peak hour",
                  value: d.peakHour?.label ?? "—",
                  hint: d.peakHour ? `${d.peakHour.count} listens` : undefined,
                },
              ]}
            />

            <div className="flex flex-wrap gap-3.5">
              <div className="q-in min-w-0 flex-[1.6_1_520px] [--i:3]">
                <RankedBarList
                  title="Top tracks"
                  titleId="music-album-tracks"
                  items={trackItems}
                  empty="No listens in this range."
                />
              </div>
              <div className="q-in min-w-0 flex-[1_1_300px] [--i:4]">
                <ChartStatus
                  failed={hourSeries.failed}
                  empty={hourSeries.empty}
                  title="By hour"
                  error="Could not load hour-of-day listens."
                >
                  <HourBars
                    buckets={hourSeries.value ?? []}
                    ariaLabel={`Listens to ${title} by hour of day`}
                  />
                </ChartStatus>
              </div>
            </div>

            <SketchChartPanel
              title="Day of week"
              data={dowData}
              valueLabel="listens"
              emptyMessage="No listens in this range."
            />

            {d.topMoods.length === 0 ? (
              <p className="mx-1 text-sm text-[var(--muted)]">No mood tags in this range.</p>
            ) : null}

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
                      className="text-sm text-[var(--ink)] hover:text-[var(--music)]"
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
          </div>
        ) : null}
      </ResourceStatus>
    </div>
  );
};
