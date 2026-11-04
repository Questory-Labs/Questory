"use client";

import { MediaHomeSlots } from "@/components/media/MediaHomeSlots";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import {
  PageHeader,
  ResourceStatus,
  SkeletonStatGrid,
  SkeletonTileGrid,
  StateMessage,
} from "@/components/ui";
import { featureErrorMessage } from "@/lib/app-status";
import { listeningPhrase, RANGE_EYEBROW } from "../music.utils";
import { HomeKpis } from "./components/HomeKpis";
import { MusicHomeCharts } from "./components/MusicHomeCharts";
import { NowPlayingHero } from "./components/NowPlayingHero";
import type { MusicHomeViewProps } from "./music.home.types";

export const MusicHomeView = (props: Record<string, unknown>) => {
  const {
    range,
    setRange,
    insights,
    playing,
    overview,
    topArtists,
    dailyTarget,
    heatmap,
    daySeries,
    hour,
    dow,
    years,
    services,
    showCalendar,
  } = props as MusicHomeViewProps;

  const d = insights.value;
  const nowPlaying = playing.value ?? null;
  const spark = (daySeries.value || []).map((b) => b.count);

  return (
    <MediaHomeSlots
      header={
        <PageHeader
          size="sm"
          eyebrow={`Music · ${RANGE_EYEBROW[range]}`}
          title={
            d ? (
              <>
                {d.periodListens.toLocaleString()} plays,{" "}
                <em className="font-serif font-normal text-[#f0c4cf]">
                  {listeningPhrase(d.peakHour?.hour)}
                </em>
              </>
            ) : (
              "Music"
            )
          }
          description="Listening pulse from your scrobbles — what's playing, when you listen, and what's shifting."
          actions={<MusicRangePicker value={range} onChange={setRange} />}
        />
      }
      hero={nowPlaying ? <NowPlayingHero playing={nowPlaying} /> : undefined}
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
              {featureErrorMessage(
                insights.error,
                "Could not load music analytics.",
              )}
            </StateMessage>
          }
        >
          {d ? (
            <HomeKpis
              range={range}
              insights={d}
              overview={overview.value}
              spark={spark}
            />
          ) : null}
        </ResourceStatus>
      }
      charts={
        <MusicHomeCharts
          heatmap={heatmap}
          topArtists={topArtists}
          dailyTarget={dailyTarget.value?.target ?? null}
          daySeries={daySeries}
          hour={hour}
          dow={dow}
          years={years}
          services={services}
          showCalendar={showCalendar}
          peakGenre={d?.topGenre?.name ?? null}
        />
      }
    />
  );
};
