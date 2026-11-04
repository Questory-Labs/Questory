"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CountUp } from "@questorylabs/ui";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { MusicCorrectionEdit } from "@/components/music/MusicCorrectionEdit";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import {
  ResourceStatus,
  SkeletonDetailHeader,
  StateMessage,
} from "@/components/ui";
import { displayLabel } from "@/lib/display-label";
import { formatListenDate } from "@/lib/music";
import { AlbumCardGrid } from "../components/AlbumCardGrid";
import { DetailHero } from "../components/DetailHero";
import { DetailKpiStrip } from "../components/DetailKpiStrip";
import { HourBars } from "../components/HourBars";
import { MusicBreadcrumb } from "../components/MusicBreadcrumb";
import { RankedBarList } from "../components/RankedBarList";
import {
  formatHours,
  formatMonthYear,
  initialOf,
  RANGE_PERIOD,
} from "../music.utils";
import type { MusicArtistViewProps } from "./music.artist.types";

const MORE_LINK = "text-[13px] text-[var(--muted)] hover:text-[var(--ink)]";

export const MusicArtistView = (props: Record<string, unknown>) => {
  const { id, range, setRange, detail, hours, saveBusy, onSave } =
    props as MusicArtistViewProps;

  const d = detail.value;
  const a = d?.artist;
  const title = a ? displayLabel(a.userDisplayName, a.name) : "Artist";

  const topTrackItems = useMemo(
    () =>
      d?.topTracks.map((t) => ({
        key: t.id,
        href: `/music/tracks/${t.id}`,
        label: t.title,
        sub: t.releaseTitle,
        count: t.count,
      })) ?? [],
    [d?.topTracks],
  );

  const topAlbumItems = useMemo(
    () =>
      d?.topAlbums.map((t) => ({
        key: t.id,
        href: `/music/albums/${t.id}`,
        title: t.title,
        imageUrl: t.imageUrl,
        meta: [t.year, `${t.count.toLocaleString()} listens`]
          .filter(Boolean)
          .join(" · "),
      })) ?? [],
    [d?.topAlbums],
  );

  return (
    <div className="flex flex-col gap-3.5">
      <MusicBreadcrumb href="/music/charts?kind=artists" label="Charts" current={title} />

      <ResourceStatus
        failed={detail.failed}
        empty={detail.empty}
        loading={<SkeletonDetailHeader />}
        error={<StateMessage variant="error">Artist not found.</StateMessage>}
      >
        {d && a ? (
          <div className="flex flex-col gap-3.5">
            <DetailHero
              eyebrow={
                d.rank ? `Artist · #${d.rank} ${RANGE_PERIOD[range]}` : "Artist"
              }
              title={title}
              titleId="music-artist-title"
              subtitle={
                a.userDisplayName && a.userDisplayName !== a.name ? a.name : undefined
              }
              coverUrl={a.imageUrl}
              initial={initialOf(title)}
              genres={a.genres}
              moods={d.topMoods.map((m) => m.name)}
              stats={[
                { label: "Listens", value: <CountUp value={d.listenCount} /> },
                ...(d.listeningMinutes != null
                  ? [{ label: "Hours", value: formatHours(d.listeningMinutes) }]
                  : []),
              ]}
              actions={
                <>
                  <MusicRangePicker value={range} onChange={setRange} includeAll />
                  <MusicCorrectionEdit
                    kind="artist"
                    entityId={id}
                    saving={saveBusy}
                    onSave={onSave}
                  />
                </>
              }
            />

            <DetailKpiStrip
              items={[
                { label: "Peak day", value: d.peakDow?.label ?? "—" },
                { label: "Peak hour", value: d.peakHour?.label ?? "—" },
                {
                  label: "First listen",
                  value: formatMonthYear(d.firstListenAt),
                  hint: d.latestListenAt
                    ? `Latest ${formatListenDate(d.latestListenAt)}`
                    : undefined,
                },
              ]}
            />

            <div className="flex flex-wrap gap-3.5">
              <div className="q-in min-w-0 flex-[1.6_1_520px] [--i:3]">
                <RankedBarList
                  title="Top songs"
                  titleId="music-artist-songs"
                  items={topTrackItems}
                  empty="No listens in this range."
                  footer={
                    <Link href="/music/charts?kind=tracks" className={MORE_LINK}>
                      View top tracks
                    </Link>
                  }
                />
              </div>
              <div className="q-in min-w-0 flex-[1_1_300px] [--i:4]">
                <ChartStatus
                  failed={hours.failed}
                  empty={hours.empty}
                  title="By hour"
                  error="Could not load hour-of-day listens."
                >
                  <HourBars
                    buckets={hours.value ?? []}
                    ariaLabel={`Listens to ${title} by hour of day`}
                  />
                </ChartStatus>
              </div>
            </div>

            <AlbumCardGrid
              titleId="music-artist-albums"
              heading={
                <>
                  Top{" "}
                  <em className="font-serif font-normal text-[#f0c4cf]">albums</em>
                </>
              }
              items={topAlbumItems}
              empty="No album listens in this range."
              footer={
                <Link href="/music/charts?kind=albums" className={MORE_LINK}>
                  View top albums
                </Link>
              }
            />
          </div>
        ) : null}
      </ResourceStatus>
    </div>
  );
};
