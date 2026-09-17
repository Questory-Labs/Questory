"use client";

import { HourDowSources } from "@/components/media/HourDowSources";
import { MediaHomeSlots } from "@/components/media/MediaHomeSlots";
import { StatCard } from "@/components/StatCard";
import {
  PageHeader,
  ResourceStatus,
  SkeletonStatGrid,
  SkeletonTileGrid,
  StateMessage,
} from "@/components/ui";
import { formatDeltaPct, formatShare } from "@/lib/read";
import type { ReadHomeViewProps } from "./read.home.types";

export const ReadHomeView = (props: Record<string, unknown>) => {
  const { insights, hour, dow, formats, sources } = props as ReadHomeViewProps;
  const d = insights.value;
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
          title="Read"
          description="Manga, manhwa, and print analytics from AniList. Connect under Read → Sources."
        />
      }
      kpis={
        <ResourceStatus
          failed={insights.failed}
          empty={insights.empty}
          loading={
            <>
              <SkeletonStatGrid count={4} />
              <SkeletonTileGrid count={4} className="mt-6" />
            </>
          }
          error={
            <StateMessage variant="error">
              Could not load read analytics.
            </StateMessage>
          }
        >
          {d ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Events"
                value={d.periodEvents}
                hint={
                  d.compare.deltaPct != null
                    ? `${formatDeltaPct(d.compare.deltaPct)} vs prior`
                    : undefined
                }
              />
              <StatCard label="Chapters logged" value={d.chaptersLogged} />
              <StatCard label="New titles" value={d.newTitles} />
              <StatCard label="Unique titles" value={d.uniqueTitles} />
            </div>
          ) : null}
        </ResourceStatus>
      }
      charts={
        <>
          {peakCaption ? (
            <p className="mt-6 text-xs text-[var(--muted)]">{peakCaption}</p>
          ) : null}
          <HourDowSources
            hour={hour}
            dow={dow}
            extra={formats}
            sources={sources}
            extraTitle="Formats"
            hourError="Could not load hour-of-day events."
            dowError="Could not load day-of-week events."
            extraError="Could not load formats."
            sourcesError="Could not load read sources."
            hourData={hour.value || []}
            dowData={dow.value || []}
            extraData={formats.value?.items || []}
            sourceItems={sources.value?.items || []}
            valueLabel="events"
            periodTotal={sources.value?.periodEvents ?? 0}
            formatShare={formatShare}
          />
        </>
      }
    />
  );
};
