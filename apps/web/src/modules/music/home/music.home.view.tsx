"use client";

import { Sparkline } from "@/components/charts/Sparkline";
import { MediaHomeSlots } from "@/components/media/MediaHomeSlots";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import { NowPlayingPanel } from "@/components/music/NowPlayingPanel";
import { StatCard } from "@/components/StatCard";
import {
  PageHeader,
  ResourceStatus,
  SkeletonStatGrid,
  SkeletonTileGrid,
  StateMessage,
} from "@/components/ui";
import { formatDeltaPct, formatMinutes } from "@/lib/music";
import { MusicHomeCharts } from "./components/MusicHomeCharts";
import type { MusicHomeViewProps } from "./music.home.types";

export const MusicHomeView = (props: Record<string, unknown>) => {
  const {
    range,
    setRange,
    insights,
    playing,
    heatmap,
    daySeries,
    hour,
    dow,
    years,
    services,
    showCalendar,
  } = props as MusicHomeViewProps;

  const d = insights.value;
  const nowPlaying = playing.value?.track ?? null;
  const spark = (daySeries.value || []).map((b) => b.count);
  const peakCaption = [
    d?.peakHour ? `Peak ${d.peakHour.label}` : null,
    d?.topGenre ? d.topGenre.name : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <MediaHomeSlots
      header={
        <PageHeader
          size="sm"
          title="Music"
          description="Listening pulse from your scrobbles — what's playing, when you listen, and what's shifting."
          actions={<MusicRangePicker value={range} onChange={setRange} />}
        />
      }
      hero={nowPlaying ? <NowPlayingPanel track={nowPlaying} /> : undefined}
      kpis={
        <ResourceStatus
          failed={insights.failed}
          empty={insights.empty}
          loading={
            <>
              <SkeletonStatGrid count={4} className="mb-6" />
              <SkeletonTileGrid count={4} />
            </>
          }
          error={
            <StateMessage variant="error">
              Could not load music analytics.
            </StateMessage>
          }
        >
          {d ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard
                label="Listens"
                value={d.periodListens}
                hint={
                  d.compare.deltaPct != null
                    ? `${formatDeltaPct(d.compare.deltaPct)} vs prior`
                    : undefined
                }
                sparkline={
                  spark.length > 1 ? (
                    <Sparkline data={spark} ariaLabel="Listens by day" />
                  ) : undefined
                }
              />
              <StatCard
                label="Listening time"
                value={formatMinutes(d.listeningMinutes)}
              />
              <StatCard label="New artists" value={d.newArtists} />
              <StatCard label="Unique artists" value={d.uniqueArtists} />
              <StatCard
                label="Coverage"
                value={`${d.durationCoverage}%`}
                hint="listens with duration"
              />
            </div>
          ) : null}
        </ResourceStatus>
      }
      charts={
        <MusicHomeCharts
          heatmap={heatmap}
          daySeries={daySeries}
          hour={hour}
          dow={dow}
          years={years}
          services={services}
          showCalendar={showCalendar}
          peakCaption={peakCaption || undefined}
        />
      }
    />
  );
};
