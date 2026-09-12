"use client";

import { useUser } from "@/hooks/useUser";
import { DASHBOARD_ACTIVITY_LIMIT } from "@/lib/dashboard";
import {
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonTile,
} from "@questorylabs/ui";
import Link from "next/link";
import { dashboardOccupancy } from "./dashboard-occupancy";
import {
  collectActivityItems,
  gameContinueCaption,
  mergeDashboardActivity,
} from "./dashboard-activity";
import type { DashboardViewProps } from "./steam.dashboard.types";
import { ActivityFeed } from "./components/ActivityFeed";
import { ContinueHero } from "./components/ContinueHero";
import { GlanceMediaCards } from "./components/GlanceMediaCards";
import { GlanceStats } from "./components/GlanceStats";
import { LibraryMix } from "./components/LibraryMix";
import { PlayNextSection } from "./components/PlayNextSection";
import { RecsSnippet } from "./components/RecsSnippet";

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
    watchInsights,
    watchRecent,
    readInsights,
    readRecent,
    recs,
  } = props as DashboardViewProps;
  const { user } = useUser();
  const name = user?.personaName?.trim();
  const isSteamLinked = user ? user.steamId != null : true;
  const value = stats.value;
  const syncing = sync.syncing;
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

  const playNextRows = (nextUp ?? []).filter(
    (g) => g.appId !== continueGame?.appId,
  );
  const featured = playNextRows[0];
  const restPicks = playNextRows.slice(1);

  const activity = mergeDashboardActivity(
    collectActivityItems({
      recentlyPlayed: recentlyPlayed ?? [],
      continueAppId: isHome ? undefined : continueGame?.appId,
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

  return (
    <>
      <PageHeader
        size="sm"
        eyebrow={
          showMusic || showWatch || showRead || showEnterprise
            ? "Home"
            : "Library overview"
        }
        title={
          name ? (
            <>
              Hey, <span className="text-[var(--accent)]">{name}</span>
            </>
          ) : (
            "Dashboard"
          )
        }
        description={
          syncing ? (
            <>
              Syncing Steam data
              {sync.current ? ` · ${sync.current.label}` : ""}
              {` · ${sync.doneCount}/${sync.total}`}. Stats will fill in as jobs
              finish.
            </>
          ) : showMusic || showWatch || showRead || showEnterprise ? (
            <>This week across {enabledNames.join(", ")}.</>
          ) : (
            <>Continue, mix, and cost — not eight equal tiles.</>
          )
        }
      />

      {occupancy.statsError ? null : isHome ? (
        occupancy.showUnlinked ? (
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
        ) : null
      ) : occupancy.continueSkeleton ? (
        <SkeletonTile className="max-w-xl" />
      ) : occupancy.showContinue && continueGame ? (
        <ContinueHero
          href={`/library/${continueGame.appId}`}
          name={continueGame.name}
          headerImage={continueGame.headerImage}
          caption={gameContinueCaption(
            continueGame.lastPlayedAt,
            continueGame.playtimeForever,
          )}
        />
      ) : occupancy.showUnlinked ? (
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
      ) : null}

      <div
        className={
          showEnterprise ? "grid items-start gap-8 lg:grid-cols-2" : undefined
        }
      >
        <PlayNextSection
          occupancy={occupancy}
          playNextEmpty={playNext.empty}
          featured={featured}
          restPicks={restPicks}
          syncing={syncing}
          steamLinked={isSteamLinked}
        />
        {showEnterprise && recs ? <RecsSnippet recs={recs} /> : null}
      </div>

      <GlanceStats
        stats={stats}
        sync={sync}
        extra={
          <GlanceMediaCards
            showMusic={showMusic}
            showWatch={showWatch}
            showRead={showRead}
            musicInsights={musicInsights}
            watchInsights={watchInsights}
            readInsights={readInsights}
          />
        }
      />

      {showMusic || showWatch || showRead ? (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-bold tracking-tight">
            Recent activity
          </h2>
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
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-bold tracking-tight">
            Recently played
          </h2>
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
    </>
  );
};
