"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CountUp } from "@questorylabs/ui";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { ArtistLinks } from "./components/ArtistLinks";
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
import { DotHeatmap } from "../home/components/DotHeatmap";
import { formatClock, initialOf } from "../music.utils";
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

  const d = detail.value;
  const t = d?.track;
  const title = t ? displayLabel(t.userDisplayName, t.title) : "Track";

  const dowData = useMemo(
    () =>
      (dowSeries.value || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [dowSeries.value],
  );
  const genres = useMemo(
    () => [...new Set((t?.genres ?? []).map((g) => g.name))],
    [t?.genres],
  );

  const total = listens.value?.total ?? 0;
  const pageSize = listens.value?.pageSize ?? MUSIC_DETAIL_LISTENS_PAGE_SIZE;
  const listenItems = listens.value?.items ?? [];

  return (
    <div className="flex flex-col gap-3.5">
      <MusicBreadcrumb href="/music/listening" label="Listening" current={title} />

      <ResourceStatus
        failed={detail.failed}
        empty={detail.empty}
        loading={<SkeletonDetailHeader />}
        error={<StateMessage variant="error">Track not found.</StateMessage>}
      >
        {d && t ? (
          <div className="flex flex-col gap-3.5">
            <DetailHero
              eyebrow="Track"
              title={title}
              titleId="music-track-title"
              subtitle={
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
                          className="font-serif text-lg hover:text-[var(--ink)]"
                        >
                          {t.releaseTitle}
                        </Link>
                      ) : (
                        <span className="font-serif text-lg">{t.releaseTitle}</span>
                      )}
                    </>
                  ) : null}
                  {t.userDisplayName && t.userDisplayName !== t.title ? (
                    <span className="block text-sm">{t.title}</span>
                  ) : null}
                </>
              }
              coverUrl={t.imageUrl}
              initial={initialOf(title)}
              genres={genres}
              stats={[
                { label: "Listens", value: <CountUp value={d.listenCount} /> },
                ...(t.durationMs
                  ? [{ label: "Length", value: formatClock(t.durationMs) }]
                  : []),
              ]}
              actions={
                <>
                  <MusicRangePicker value={range} onChange={onRangeChange} includeAll />
                  <MusicCorrectionEdit
                    kind="track"
                    entityId={id}
                    saving={saveBusy}
                    merging={mergeBusy}
                    onSave={onSave}
                    onMerge={onMerge}
                    onSaved={onSaved}
                  />
                </>
              }
            />

            <DetailKpiStrip
              items={[
                {
                  label: "Listening time",
                  value: d.listeningMinutes > 0 ? formatMinutes(d.listeningMinutes) : "—",
                  hint: t.durationMs ? "Estimated from track length" : undefined,
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

            <div className="q-in [--i:3]">
              <ChartStatus
                failed={heatmap.failed}
                empty={heatmap.empty}
                title="When you listen"
                error="Could not load listening heatmap."
              >
                <DotHeatmap heatmap={heatmap.value} />
              </ChartStatus>
            </div>

            <div className="flex flex-wrap gap-3.5">
              <div className="q-in min-w-0 flex-[1_1_360px] [--i:4]">
                <SketchChartPanel
                  title="Day of week"
                  data={dowData}
                  valueLabel="listens"
                  emptyMessage="No listens in this range."
                />
              </div>
              <div className="q-in min-w-0 flex-[1_1_360px] [--i:5]">
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
          </div>
        ) : null}
      </ResourceStatus>
    </div>
  );
};
