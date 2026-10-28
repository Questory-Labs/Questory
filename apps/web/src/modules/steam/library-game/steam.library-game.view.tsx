"use client";

import { TagsEditor } from "@/components/TagsEditor";
import { SegmentedControl } from "@/components/SegmentedControl";
import { GameCatalogExtras } from "@/components/game-detail/game-catalog-extras";
import { Chip, SectionTitle } from "@/components/game-detail/game-detail-shared";
import { GameFriendsSection } from "@/components/game-detail/game-friends-section";
import {
  GamePlayersSection,
  GameReviewsSection,
} from "@/components/game-detail/game-market";
import {
  ResourceStatus,
  SkeletonChart,
  SkeletonDetailHeader,
  StateMessage,
} from "@questorylabs/ui";
import { LibraryGameAchievements } from "./components/LibraryGameAchievements";
import { LibraryGameCatalog } from "./components/LibraryGameCatalog";
import { LibraryGameGlance } from "./components/LibraryGameGlance";
import { LibraryGameHero } from "./components/LibraryGameHero";
import { LibraryGameHltb } from "./components/LibraryGameHltb";
import { LibraryGameOwnedOn } from "./components/LibraryGameOwnedOn";
import { LibraryGamePriceSteps } from "./components/LibraryGamePriceSteps";
import { LibraryGameSessionBars } from "./components/LibraryGameSessionBars";
import { LibraryGameSessions } from "./components/LibraryGameSessions";
import {
  LIBRARY_GAME_FRIEND_LIMIT,
  LIBRARY_GAME_TABS,
} from "./steam.library-game.constants";
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
  const {
    entry,
    detail,
    sessions,
    setStatus,
    tab = "overview",
    setTab,
  } = props as LibraryGameViewProps;
  const e = entry.value;
  const d = detail.value;
  const currency = d?.price.currency || "USD";
  const hours = e ? playtimeHours(e.playtimeForever) : 0;
  const storePrice = d?.price.current ?? e?.game.currentPrice ?? null;
  const status = setStatus?.busy
    ? (setStatus.input ?? null)
    : (e?.userStatus ?? d?.userStatus ?? null);
  const hasSteamDetail = e?.game.appId != null && e.game.appId > 0;
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
      error={<StateMessage variant="error">Could not load this game.</StateMessage>}
    >
      {e ? (
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3.5">
          <LibraryGameHero
            entry={e}
            detail={d}
            status={status}
            statusBusy={setStatus?.busy}
            onStatusChange={setStatus ? (s) => setStatus.submit(s) : undefined}
          />
          {setStatus?.failed ? (
            <p role="alert" className="text-[13px] text-[var(--danger)]">
              Could not update status.
            </p>
          ) : null}

          {setTab && hasSteamDetail ? (
            <div className="q-in self-start" style={{ ["--i" as string]: 2 }}>
              <SegmentedControl
                label="Game sections"
                value={tab}
                onChange={setTab}
                options={LIBRARY_GAME_TABS}
              />
            </div>
          ) : null}

          {tab === "overview" ? (
            <>
              <LibraryGameGlance tiles={tiles} />
              <LibraryGameSessions sessions={sessions} />
            </>
          ) : null}

          {hasSteamDetail ? (
            <ResourceStatus
              failed={detail.failed}
              empty={detail.empty}
              loading={<SkeletonChart className="mt-4" />}
              error={
                <StateMessage variant="error">
                  Could not load enriched game stats.
                </StateMessage>
              }
            >
              {d ? (
                <>
                  {tab === "overview" ? (
                    <div className="flex flex-wrap gap-3.5">
                      <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-3.5">
                        {d.sessions90d ? (
                          <LibraryGameSessionBars sessions={d.sessions90d} />
                        ) : null}
                        <LibraryGameHltb hltb={d.hltb} hours={hours} />
                      </div>
                      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
                        <section className="panel q-in p-5" style={{ ["--i" as string]: 5 }}>
                          <GameFriendsSection
                            detail={d}
                            linkFriends
                            friendLimit={LIBRARY_GAME_FRIEND_LIMIT}
                          />
                        </section>
                        <section className="panel q-in p-5" style={{ ["--i" as string]: 6 }}>
                          <LibraryGameOwnedOn entry={e} currency={currency} />
                        </section>
                        {d.minPlayers != null && d.maxPlayers != null ? (
                          <section className="panel q-in p-5" style={{ ["--i" as string]: 7 }}>
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
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {tab === "achievements" ? (
                    <LibraryGameAchievements achievements={d.achievements} />
                  ) : null}

                  {tab === "market" ? (
                    <div className="flex flex-col gap-3.5">
                      <LibraryGamePriceSteps price={d.price} pricePaid={e.pricePaid} />
                      <div className="grid items-start gap-3.5 lg:grid-cols-2">
                        <section className="panel q-in p-5">
                          <GamePlayersSection detail={d} chartSize="lg" />
                        </section>
                        <section className="panel q-in p-5">
                          <GameReviewsSection detail={d} chartSize="lg" />
                        </section>
                      </div>
                    </div>
                  ) : null}

                  {tab === "catalog" ? (
                    <div className="flex flex-col gap-3.5">
                      <LibraryGameCatalog detail={d} />
                      <div className="space-y-8">
                        <GameCatalogExtras detail={d} />
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </ResourceStatus>
          ) : null}

          {tab === "overview" ? (
            <section className="panel q-in p-5">
              <TagsEditor itemKey={`steam_game:${e.game.id}`} />
            </section>
          ) : null}
        </div>
      ) : null}
    </ResourceStatus>
  );
};
