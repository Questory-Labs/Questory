"use client";

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

  return (
    <>
      <PageHeader
        title="Music"
        description="Listening pulse from your scrobbles — what's playing, when you listen, and what's shifting."
        actions={<MusicRangePicker value={range} onChange={setRange} />}
      />

      {nowPlaying ? <NowPlayingPanel track={nowPlaying} /> : null}

      <ResourceStatus
        failed={insights.failed}
        empty={insights.empty}
        loading={
          <>
            <SkeletonStatGrid
              count={6}
              className="mb-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
            />
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
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                {
                  label: "Listens",
                  value: d.periodListens,
                  hint:
                    d.compare.deltaPct != null
                      ? `${formatDeltaPct(d.compare.deltaPct)} vs prior`
                      : undefined,
                },
                {
                  label: "Listening time",
                  value: formatMinutes(d.listeningMinutes),
                  hint:
                    d.durationCoverage < 100
                      ? `${d.durationCoverage}% coverage`
                      : undefined,
                },
                { label: "New artists", value: d.newArtists },
                { label: "New tracks", value: d.newTracks },
                { label: "Top track share", value: `${d.topTrackShare}%` },
                { label: "Unique artists", value: d.uniqueArtists },
              ].map((card) => (
                <StatCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  hint={card.hint}
                />
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                d.peakHour
                  ? {
                      label: "Peak hour",
                      value: d.peakHour.label,
                      hint: `${d.peakHour.count} listens`,
                    }
                  : null,
                d.peakDow
                  ? {
                      label: "Peak day",
                      value: d.peakDow.label,
                      hint: `${d.peakDow.count} listens`,
                    }
                  : null,
                d.topGenre
                  ? {
                      label: "Top genre",
                      value: d.topGenre.name,
                      hint: `${d.topGenre.count} tagged`,
                    }
                  : null,
                d.topMood
                  ? {
                      label: "Top mood",
                      value: d.topMood.name,
                      hint: `${d.topMood.count} tagged`,
                    }
                  : null,
              ]
                .filter(Boolean)
                .map((card) => (
                  <StatCard
                    key={card!.label}
                    label={card!.label}
                    value={card!.value}
                    hint={card!.hint}
                  />
                ))}
            </div>
          </>
        ) : null}
      </ResourceStatus>

      <MusicHomeCharts
        heatmap={heatmap}
        daySeries={daySeries}
        hour={hour}
        dow={dow}
        years={years}
        services={services}
        showCalendar={showCalendar}
      />
    </>
  );
};
