"use client";

import { EmptyState, ResourceStatus, SkeletonStat } from "@questorylabs/ui";
import { StatCard } from "@/components/StatCard";
import { dashboardRangeLabel } from "@/lib/dashboard";
import { formatDeltaPct, formatMinutes } from "@/lib/music";
import { formatDeltaPct as formatWatchDelta } from "@/lib/watch";
import { formatDeltaPct as formatReadDelta } from "@/lib/read";
import type { DashboardViewProps } from "../steam.dashboard.types";

const GlanceStatSkeleton = () => (
  <div
    className="rounded-lg border border-[var(--line)] bg-[var(--bg-2)] p-4"
    aria-busy="true"
    aria-label="Loading stats"
  >
    <SkeletonStat />
  </div>
);

const failCell = (title: string) => (
  <div className="sm:col-span-2 lg:col-span-3">
    <EmptyState
      title={<span className="text-[var(--danger)]">{title}</span>}
    />
  </div>
);

const hintLine = (...parts: Array<string | null | undefined>) =>
  parts.filter(Boolean).join(" · ");

const watchHint = (
  rangeLabel: string,
  watch: {
    movieWatches: number;
    showWatches: number;
    compare: { deltaPct: number | null };
  },
) =>
  hintLine(
    rangeLabel,
    watch.movieWatches > 0 ? `${watch.movieWatches} movies` : null,
    watch.showWatches > 0 ? `${watch.showWatches} TV` : null,
    watch.compare.deltaPct != null
      ? `${formatWatchDelta(watch.compare.deltaPct)} vs prior`
      : null,
  );

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
  const musicRange = dashboardRangeLabel(musicD?.range);
  const watchRange = dashboardRangeLabel(watchD?.range);
  const readRange = dashboardRangeLabel(readD?.range);

  return (
    <>
      {showMusic && musicInsights ? (
        <ResourceStatus
          failed={musicInsights.failed}
          empty={musicInsights.empty}
          loading={
            <>
              <GlanceStatSkeleton />
              <GlanceStatSkeleton />
            </>
          }
          error={failCell("Could not load music stats.")}
        >
          <>
            <StatCard
              label="Listens"
              value={musicD?.periodListens ?? "—"}
              hint={hintLine(
                musicRange,
                musicD?.compare.deltaPct != null
                  ? `${formatDeltaPct(musicD.compare.deltaPct)} vs prior`
                  : null,
              )}
              href="/music"
            />
            <StatCard
              label="Listening time"
              value={musicD ? formatMinutes(musicD.listeningMinutes) : "—"}
              hint={musicRange}
              href="/music"
            />
          </>
        </ResourceStatus>
      ) : null}
      {showWatch && watchInsights ? (
        <ResourceStatus
          failed={watchInsights.failed}
          empty={watchInsights.empty}
          loading={<GlanceStatSkeleton />}
          error={failCell("Could not load watch stats.")}
        >
          <StatCard
            label="Watches"
            value={watchD?.periodWatches ?? "—"}
            hint={watchD ? watchHint(watchRange, watchD) : watchRange}
            href="/watch"
          />
        </ResourceStatus>
      ) : null}
      {showRead && readInsights ? (
        <ResourceStatus
          failed={readInsights.failed}
          empty={readInsights.empty}
          loading={<GlanceStatSkeleton />}
          error={failCell("Could not load read stats.")}
        >
          <StatCard
            label="Read events"
            value={readD?.periodEvents ?? "—"}
            hint={
              readD
                ? hintLine(
                    readRange,
                    `${readD.chaptersLogged} chapters`,
                    readD.compare.deltaPct != null
                      ? `${formatReadDelta(readD.compare.deltaPct)} vs prior`
                      : null,
                  )
                : readRange
            }
            href="/read"
          />
        </ResourceStatus>
      ) : null}
    </>
  );
};
