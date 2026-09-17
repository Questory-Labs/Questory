"use client";

import { TagsEditor } from "@/components/TagsEditor";
import { GameCatalogExtras } from "@/components/game-detail/game-catalog-extras";
import { Chip, SectionTitle } from "@/components/game-detail/game-detail-shared";
import { GameFriendsSection } from "@/components/game-detail/game-friends-section";
import {
  GamePlayersSection,
  GamePriceSection,
  GameReviewsSection,
} from "@/components/game-detail/game-market";
import {
  GameAchievementsSection,
  GameHltbSection,
} from "@/components/game-detail/game-progress";
import {
  ResourceStatus,
  SkeletonChart,
  SkeletonDetailHeader,
  StateMessage,
} from "@questorylabs/ui";
import { LibraryGameGlance } from "./components/LibraryGameGlance";
import { LibraryGameHero } from "./components/LibraryGameHero";
import { LibraryGameOwnedOn } from "./components/LibraryGameOwnedOn";
import { LibraryGameSessions } from "./components/LibraryGameSessions";
import { LIBRARY_GAME_FRIEND_LIMIT } from "./steam.library-game.constants";
import type { LibraryGameViewProps } from "./steam.library-game.types";
import {
  costPerHour,
  friendRank,
  glanceTiles,
  hltbStory,
  playtimeHours,
  priceStory,
} from "./steam.library-game.utils";

export const LibraryGameView = (props: Record<string, unknown>) => {
  const { entry, detail, sessions } = props as LibraryGameViewProps;
  const e = entry.value;
  const d = detail.value;
  const currency = d?.price.currency || "USD";
  const hours = e ? playtimeHours(e.playtimeForever) : 0;
  const storePrice = d?.price.current ?? e?.game.currentPrice ?? null;
  const tiles = e
    ? glanceTiles({
        achievements: d?.achievements,
        hltb: hltbStory(hours, d?.hltb),
        sessions: sessions.value
          ? {
              count: sessions.value.total,
              lastEndedAt: sessions.value.items[0]?.endedAt ?? null,
            }
          : null,
        cost: costPerHour(hours, e.pricePaid, storePrice),
        currency,
        review: d?.review,
        friendCount: d?.friendOwners.length ?? 0,
        rank: d ? friendRank(hours, d.friendOwners) : null,
        playersNow: d?.onlinePlayers?.current,
        price: priceStory(
          storePrice,
          d?.price.historicalLow ?? e.game.lowestPrice,
          d?.price.historicalHigh,
          currency,
        ),
      })
    : [];

  return (
    <ResourceStatus
      failed={entry.failed}
      empty={entry.empty}
      loading={<SkeletonDetailHeader />}
      error={
        <StateMessage variant="error">Could not load this game.</StateMessage>
      }
    >
      {e ? (
        <>
          <LibraryGameHero entry={e} detail={d} />
          <LibraryGameGlance tiles={tiles} />
          <div className="mt-10">
            <LibraryGameSessions sessions={sessions} />
          </div>

          {e.game.appId != null && e.game.appId > 0 ? (
            <ResourceStatus
              failed={detail.failed}
              empty={detail.empty}
              loading={<SkeletonChart className="mt-10" />}
              error={
                <StateMessage variant="error">
                  Could not load enriched game stats.
                </StateMessage>
              }
            >
              {d ? (
                <div className="mt-10 space-y-10">
                  <div className="grid items-start gap-10 lg:grid-cols-2">
                    <div className="space-y-8">
                      <h2 className="font-display text-lg font-semibold">
                        Your progress
                      </h2>
                      <GameHltbSection
                        detail={d}
                        playtimeHours={hours}
                      />
                      <GameAchievementsSection detail={d} />
                    </div>
                    <div className="space-y-8">
                      <h2 className="font-display text-lg font-semibold">
                        Friends
                      </h2>
                      <GameFriendsSection
                        detail={d}
                        linkFriends
                        friendLimit={LIBRARY_GAME_FRIEND_LIMIT}
                      />
                      <LibraryGameOwnedOn entry={e} currency={currency} />
                      {d.minPlayers != null && d.maxPlayers != null && (
                        <section>
                          <SectionTitle>Multiplayer</SectionTitle>
                          <p className="text-sm text-[var(--muted)]">
                            {d.minPlayers === d.maxPlayers
                              ? `${d.maxPlayers} players`
                              : `${d.minPlayers}–${d.maxPlayers} players`}
                          </p>
                          {d.playerMaxes && d.playerMaxes.length > 1 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {d.playerMaxes.map((n) => (
                                <Chip key={n}>MAX {n}</Chip>
                              ))}
                            </div>
                          ) : null}
                        </section>
                      )}
                    </div>
                  </div>

                  <section aria-label="Market">
                    <h2 className="mb-6 font-display text-lg font-semibold">
                      Market
                    </h2>
                    <div className="grid items-start gap-10 lg:grid-cols-2">
                      <GamePriceSection detail={d} chartSize="lg" />
                      <GamePlayersSection detail={d} chartSize="lg" />
                    </div>
                    <div className="mt-10">
                      <GameReviewsSection detail={d} chartSize="lg" />
                    </div>
                  </section>

                  <div className="space-y-8">
                    <GameCatalogExtras detail={d} />
                  </div>
                </div>
              ) : null}
            </ResourceStatus>
          ) : null}

          <section className="mt-10">
            <TagsEditor itemKey={`steam_game:${e.game.id}`} />
          </section>
        </>
      ) : null}
    </ResourceStatus>
  );
};
