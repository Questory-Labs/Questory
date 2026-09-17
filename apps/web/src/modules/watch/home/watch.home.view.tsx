"use client";

import { useMemo } from "react";
import { HourDowSources } from "@/components/media/HourDowSources";
import { MediaHomeSlots } from "@/components/media/MediaHomeSlots";
import { StatCard } from "@/components/StatCard";
import { WatchAddButton } from "@/components/watch/WatchAddButton";
import { WatchMediaPicker } from "./components/WatchMediaPicker";
import {
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonStatGrid,
  SkeletonTileGrid,
  StateMessage,
} from "@/components/ui";
import { formatDeltaPct, formatMinutes, formatShare } from "@/lib/watch";
import type { WatchHomeViewProps } from "./watch.home.types";

export const WatchHomeView = (props: Record<string, unknown>) => {
  const { media, setMedia, insights, hour, dow, years, sources } =
    props as WatchHomeViewProps;

  const d = insights.value;
  const yearData = useMemo(
    () =>
      (years.value?.items || [])
        .filter((i) => i.key !== "unknown")
        .slice()
        .reverse(),
    [years.value],
  );
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
          title="Watch"
          description={
            <p>
              Movie &amp; TV analytics from Trakt, Letterboxd, AniList, and
              local player webhooks.
            </p>
          }
          actions={
            <div className="header-controls">
              <WatchAddButton />
              <WatchMediaPicker value={media} onChange={setMedia} />
            </div>
          }
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
              Could not load watch analytics.
            </StateMessage>
          }
        >
          {d ? (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <StatCard
                  label="Watches"
                  value={d.periodWatches}
                  hint={
                    d.compare.deltaPct != null
                      ? `${formatDeltaPct(d.compare.deltaPct)} vs prior`
                      : undefined
                  }
                />
                <StatCard
                  label="Watching time"
                  value={formatMinutes(d.watchingMinutes)}
                />
                <StatCard label="New titles" value={d.newTitles} />
                <StatCard label="Unique titles" value={d.uniqueTitles} />
                <StatCard
                  label="Coverage"
                  value={`${d.runtimeCoverage}%`}
                  hint="watches with runtime"
                />
              </div>
              {media === "all" ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Panel variant="outline" className="p-3 text-sm">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                      Movies
                    </p>
                    <p className="mt-1">
                      {d.movieWatches} watches · {formatMinutes(d.movieMinutes)}
                    </p>
                  </Panel>
                  <Panel variant="outline" className="p-3 text-sm">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                      TV
                    </p>
                    <p className="mt-1">
                      {d.showWatches} watches · {formatMinutes(d.showMinutes)}
                    </p>
                  </Panel>
                </div>
              ) : null}
            </>
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
            extra={years}
            sources={sources}
            extraTitle="Release years"
            hourError="Could not load hour-of-day watches."
            dowError="Could not load day-of-week watches."
            extraError="Could not load release years."
            sourcesError="Could not load watch sources."
            hourData={hour.value || []}
            dowData={dow.value || []}
            extraData={yearData}
            sourceItems={sources.value?.items || []}
            valueLabel="watches"
            periodTotal={sources.value?.periodWatches ?? 0}
            formatShare={formatShare}
          />
        </>
      }
    />
  );
};
