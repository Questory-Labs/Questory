"use client";

import { EmptyState, ResourceStatus, SkeletonStatGrid } from "@questorylabs/ui";
import { StatCard } from "@/components/StatCard";
import { formatDeltaPct, formatMinutes } from "@/lib/music";
import { formatDeltaPct as formatWatchDelta } from "@/lib/watch";
import { formatDeltaPct as formatReadDelta } from "@/lib/read";
import type { DashboardViewProps } from "../steam.dashboard.types";

export const GlanceMediaCards = ({
  showMusic,
  showWatch,
  showRead,
  musicInsights,
  watchInsights,
  readInsights,
}: Pick<
  DashboardViewProps,
  | "showMusic"
  | "showWatch"
  | "showRead"
  | "musicInsights"
  | "watchInsights"
  | "readInsights"
>) => {
  const musicD = musicInsights?.value;
  const watchD = watchInsights?.value;
  const readD = readInsights?.value;

  return (
    <>
      {showMusic && musicInsights ? (
        <ResourceStatus
          failed={musicInsights.failed}
          empty={musicInsights.empty}
          loading={<SkeletonStatGrid count={2} />}
          error={
            <EmptyState
              title={
                <span className="text-[var(--danger)]">
                  Could not load music stats.
                </span>
              }
            />
          }
        >
          <>
            <StatCard
              label="Listens"
              value={musicD?.periodListens ?? "—"}
              hint={
                musicD?.compare.deltaPct != null
                  ? `${formatDeltaPct(musicD.compare.deltaPct)} vs prior`
                  : "Last 7 days"
              }
              href="/music"
            />
            <StatCard
              label="Listening time"
              value={musicD ? formatMinutes(musicD.listeningMinutes) : "—"}
              href="/music"
            />
          </>
        </ResourceStatus>
      ) : null}
      {showWatch && watchInsights ? (
        <ResourceStatus
          failed={watchInsights.failed}
          empty={watchInsights.empty}
          loading={<SkeletonStatGrid count={1} />}
          error={
            <EmptyState
              title={
                <span className="text-[var(--danger)]">
                  Could not load watch stats.
                </span>
              }
            />
          }
        >
          <StatCard
            label="Watches"
            value={watchD?.periodWatches ?? "—"}
            hint={
              watchD
                ? `${watchD.movieWatches} movies · ${watchD.showWatches} TV${
                    watchD.compare.deltaPct != null
                      ? ` · ${formatWatchDelta(watchD.compare.deltaPct)}`
                      : ""
                  }`
                : "Last 7 days"
            }
            href="/watch"
          />
        </ResourceStatus>
      ) : null}
      {showRead && readInsights ? (
        <ResourceStatus
          failed={readInsights.failed}
          empty={readInsights.empty}
          loading={<SkeletonStatGrid count={2} />}
          error={
            <EmptyState
              title={
                <span className="text-[var(--danger)]">
                  Could not load read stats.
                </span>
              }
            />
          }
        >
          <>
            <StatCard
              label="Read events"
              value={readD?.periodEvents ?? "—"}
              hint={
                readD?.compare.deltaPct != null
                  ? `${formatReadDelta(readD.compare.deltaPct)} vs prior`
                  : "Last 7 days"
              }
              href="/read"
            />
            <StatCard
              label="Chapters logged"
              value={readD?.chaptersLogged ?? "—"}
              href="/read"
            />
          </>
        </ResourceStatus>
      ) : null}
    </>
  );
};
