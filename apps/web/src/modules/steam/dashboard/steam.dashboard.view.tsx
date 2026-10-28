"use client";

import { useUser } from "@/hooks/useUser";
import { DASHBOARD_ACTIVITY_LIMIT } from "@/lib/dashboard";
import { EmptyState, ResourceStatus, SkeletonTile } from "@questorylabs/ui";
import Link from "next/link";
import { dashboardOccupancy } from "./dashboard-occupancy";
import {
  collectActivityItems,
  mergeDashboardActivity,
} from "./dashboard-activity";
import { musicNowCard, readNowCard, watchNowCard } from "./dashboard-now";
import { timePlayedModel } from "./dashboard-time";
import { DASHBOARD_DEFAULT_TIME_RANGE } from "./steam.dashboard.constants";
import type { DashboardViewProps } from "./steam.dashboard.types";
import { ActivityFeed } from "./components/ActivityFeed";
import { ContinueHero } from "./components/ContinueHero";
import { DashboardHeader } from "./components/DashboardHeader";
import { GlanceMediaCards } from "./components/GlanceMediaCards";
import { GlanceStats } from "./components/GlanceStats";
import { GoalsCard } from "./components/GoalsCard";
import { LibraryMix } from "./components/LibraryMix";
import { NowCard } from "./components/NowCard";
import { PlayNextSection } from "./components/PlayNextSection";
import { RecsSnippet } from "./components/RecsSnippet";
import { SummaryTiles } from "./components/SummaryTiles";
import { TimePlayedHero } from "./components/TimePlayedHero";

const unlinkedState = (
  <EmptyState
    title="Link Steam from Connections to sync your library."
    description={
      <Link
        href="/settings/connections"
        className="text-[var(--accent)] hover:underline"
      >
        Open Connections
      </Link>
    }
  />
);

export const DashboardView = (props: Record<string, unknown>) => {
  const {
    recentlyPlayed,
    nextUp,
    stats,
    playNext,
    sync,
    showMusic = false,
    showWatch = false,
    showRead = false,
    showEnterprise = false,
    musicInsights,
    musicRecent,
    musicPlayingNow,
    watchInsights,
    watchRecent,
    readInsights,
    readRecent,
    recs,
    goals,
    range = DASHBOARD_DEFAULT_TIME_RANGE,
    setRange,
    now = null,
  } = props as DashboardViewProps;
  const { user } = useUser();
  const name = user?.personaName?.trim();
  const isSteamLinked = user ? user.steamId != null : true;
  const value = stats.value;
  const syncing = sync.active;
  const continueGame = recentlyPlayed?.[0] ?? null;
  const occupancy = dashboardOccupancy({
    steamLinked: isSteamLinked,
    statsFailed: stats.failed,
    statsEmpty: stats.empty,
    hasContinue: Boolean(continueGame),
    playNextFailed: playNext.failed,
    playNextEmpty: playNext.empty,
  });
  const isHome = showMusic || showWatch || showRead;

  const picks = (nextUp ?? []).filter((g) => g.appId !== continueGame?.appId);

  const activity = mergeDashboardActivity(
    collectActivityItems({
      recentlyPlayed: recentlyPlayed ?? [],
      continueAppId: continueGame?.appId,
      showMusic,
      showWatch,
      showRead,
      musicItems: musicRecent?.value?.items,
      watchItems: watchRecent?.value?.items,
      readItems: readRecent?.value?.items,
    }),
    DASHBOARD_ACTIVITY_LIMIT,
  );

  const activityFailed =
    (showMusic && Boolean(musicRecent?.failed)) ||
    (showWatch && Boolean(watchRecent?.failed)) ||
    (showRead && Boolean(readRecent?.failed));

  const enabledNames = [
    "Steam",
    showMusic ? "music" : null,
    showWatch ? "watch" : null,
    showRead ? "read" : null,
  ].filter(Boolean);

  const mediaCards = [
    showMusic && now
      ? musicNowCard({
          playingNow: musicPlayingNow ?? undefined,
          recent: musicRecent?.value?.items[0],
          insights: musicInsights?.value,
          now,
        })
      : null,
    showWatch ? watchNowCard(watchRecent?.value?.items[0]) : null,
    showRead ? readNowCard(readRecent?.value?.items[0]) : null,
  ].filter((c): c is NonNullable<typeof c> => c != null);

  const timeModel =
    value?.timePlayed && now ? timePlayedModel(value.timePlayed, range, now) : null;
  const hasSummary = value?.syncedSources != null || value?.needsYou != null;

  return (
    <div className="flex flex-col gap-3.5">
      <DashboardHeader
        now={now}
        name={name}
        range={value?.timePlayed ? range : undefined}
        onRangeChange={setRange}
        description={
          syncing ? (
            <>
              Syncing Steam data
              {sync.current ? ` · ${sync.current.label}` : ""}
              {` · ${sync.doneCount}/${sync.total}`}. Stats will fill in as jobs
              finish.
            </>
          ) : (
            <>This week across {enabledNames.join(", ")}.</>
          )
        }
      />

      <div className="flex flex-wrap items-stretch gap-3.5">
        {hasSummary || timeModel ? (
          <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-3.5">
            <SummaryTiles syncedSources={value?.syncedSources} needsYou={value?.needsYou} />
            {timeModel ? <TimePlayedHero model={timeModel} /> : null}
          </div>
        ) : stats.empty && !stats.failed ? (
          <div className="min-w-0 flex-[1_1_400px]">
            <SkeletonTile />
          </div>
        ) : null}

        <div className="grid min-w-0 flex-[1.35_1_520px] grid-cols-[repeat(auto-fit,minmax(250px,1fr))] content-start gap-3.5">
          {occupancy.statsError ? null : occupancy.continueSkeleton ? (
            <SkeletonTile />
          ) : occupancy.showContinue && continueGame ? (
            <ContinueHero game={continueGame} />
          ) : occupancy.showUnlinked ? (
            unlinkedState
          ) : null}
          {mediaCards.map((card, i) => (
            <NowCard key={card.key} card={card} index={5 + i} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3.5">
        {showEnterprise && recs ? <RecsSnippet recs={recs} /> : null}
        <PlayNextSection
          occupancy={occupancy}
          playNextEmpty={playNext.empty}
          picks={picks}
          syncing={syncing}
          steamLinked={isSteamLinked}
        />
        {showEnterprise && goals ? <GoalsCard goals={goals} /> : null}
      </div>

      <GlanceStats
        stats={stats}
        sync={sync}
        extra={
          isHome ? (
            <GlanceMediaCards
              showMusic={showMusic}
              showWatch={showWatch}
              showRead={showRead}
              musicInsights={musicInsights}
              watchInsights={watchInsights}
              readInsights={readInsights}
            />
          ) : undefined
        }
      />

      {isHome ? (
        <section className="mt-6">
          <h2 className="mb-3 text-[17px] font-normal">Recent activity</h2>
          {activityFailed ? (
            <EmptyState
              title={
                <span className="text-[var(--danger)]">
                  Could not load some recent activity.
                </span>
              }
            />
          ) : null}
          {activity.length ? (
            <ActivityFeed items={activity} />
          ) : activityFailed ? null : (
            <p className="text-sm text-[var(--muted)]">No recent activity yet.</p>
          )}
        </section>
      ) : (
        <section className="mt-6">
          <h2 className="mb-3 text-[17px] font-normal">Recently played</h2>
          <ResourceStatus
            failed={stats.failed}
            empty={stats.empty}
            loading={<SkeletonTile className="max-w-xl" />}
            error={
              <EmptyState
                title={
                  <span className="text-[var(--danger)]">
                    Could not load recent play sessions.
                  </span>
                }
              />
            }
          >
            {activity.length ? (
              <ActivityFeed items={activity} />
            ) : (
              <p className="text-sm text-[var(--muted)]">No other recent sessions.</p>
            )}
          </ResourceStatus>
        </section>
      )}

      {value && value.librarySize > 0 ? <LibraryMix value={value} /> : null}
    </div>
  );
};
