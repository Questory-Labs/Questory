"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { HeatmapChart } from "@/components/charts/HeatmapChart";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { ArtistLinks } from "./components/ArtistLinks";
import { MusicChip } from "@/components/music/MusicChip";
import { MusicCorrectionEdit } from "@/components/music/MusicCorrectionEdit";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import { MusicRecentListens } from "@/components/music/MusicRecentListens";
import { StatCard } from "@/components/StatCard";
import {
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonDetailHeader,
  StateMessage,
} from "@/components/ui";
import { displayLabel } from "@/lib/display-label";
import { formatListenDateTime, formatMinutes } from "@/lib/music";
import { MUSIC_DETAIL_LISTENS_PAGE_SIZE } from "@/lib/pagination";
import type { MusicTrackViewProps } from "./music.track.types";

export const MusicTrackView = (props: Record<string, unknown>) => {
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
    heatmap,
    saveBusy,
    mergeBusy,
    onSave,
    onMerge,
    onSaved,
  } = props as MusicTrackViewProps;

  const t = detail.value?.track;
  const title = t ? displayLabel(t.userDisplayName, t.title) : "Track";

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
  const clockCells = useMemo(
    () =>
      (heatmap.value?.cells || []).map((cell) => ({
        day: cell.day,
        hour: cell.hour,
        value: cell.count,
      })),
    [heatmap.value],
  );

  const total = listens.value?.total ?? 0;
  const pageSize = listens.value?.pageSize ?? MUSIC_DETAIL_LISTENS_PAGE_SIZE;
  const listenItems = listens.value?.items ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Track"
        title={title}
        description={
          t ? (
            <>
              <ArtistLinks
                artists={t.artists}
                fallbackArtistId={t.artistId}
                fallbackArtistName={t.artistName}
              />
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
        actions={
          <>
            <MusicRangePicker
              value={range}
              onChange={onRangeChange}
              includeAll
            />
            {t ? (
              <MusicCorrectionEdit
                kind="track"
                entityId={id}
                saving={saveBusy}
                merging={mergeBusy}
                onSave={onSave}
                onMerge={onMerge}
                onSaved={onSaved}
              />
            ) : null}
          </>
        }
      />

      <ResourceStatus
        failed={detail.failed}
        empty={detail.empty}
        loading={<SkeletonDetailHeader />}
        error={<StateMessage variant="error">Track not found.</StateMessage>}
      >
        {detail.value && t ? (
          <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
            <MusicCover src={t.imageUrl} alt={title} size="lg" />
            <div>
              {t.userDisplayName && t.userDisplayName !== t.title ? (
                <p className="text-sm text-[var(--muted)] pb-4">{t.title}</p>
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
                  hint={t.durationMs ? "Estimated from track length" : undefined}
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

              {t.genres.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {t.genres.map((g) => (
                    <MusicChip key={`${g.name}-${g.source}`}>{g.name}</MusicChip>
                  ))}
                </div>
              ) : null}

              <div className="mt-8 space-y-6">
                <ChartStatus
                  failed={heatmap.failed}
                  empty={heatmap.empty}
                  title="When you listen"
                  error="Could not load listening heatmap."
                >
                  <Panel className="p-4">
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                      When you listen
                    </h2>
                    <div className="mt-3">
                      <HeatmapChart
                        cells={clockCells}
                        dayLabels={heatmap.value?.dayLabels ?? []}
                        hourLabels={heatmap.value?.hourLabels ?? []}
                        maxValue={heatmap.value?.maxCount}
                        ariaLabel="Track listens by day and hour"
                      />
                    </div>
                  </Panel>
                </ChartStatus>
                <div className="grid gap-6 lg:grid-cols-2">
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
              </div>

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
                    <span className="font-mono text-[12px] text-[var(--muted)]">
                      {formatListenDateTime(row.listenedAt)}
                    </span>
                    {row.musicService || row.mediaPlayer ? (
                      <span className="font-mono text-[10px] text-[var(--faint)]">
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
                  href="/music/listening"
                  className="hover:text-[var(--accent)]"
                >
                  ← Back to listening
                </Link>
              </p>
            </div>
          </div>
        ) : null}
      </ResourceStatus>
    </>
  );
};
