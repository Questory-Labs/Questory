"use client";

import type { GameDetail } from "@questorylabs/shared";
import type { ReactNode } from "react";
import { GameDetailCatalog } from "./game-detail/GameDetailCatalog";
import { GAME_DETAIL_FRIEND_LIMIT } from "./game-detail/game-detail.constants";
import { GameFriendsSection } from "./game-detail/game-friends-section";
import { GamePlayersSection } from "./game-detail/game-market";
import {
  Chip,
  SectionTitle,
  deckLabel,
  formatReleaseDate,
} from "./game-detail/game-detail-shared";

export { OwnerRow, SectionTitle } from "./game-detail/game-detail-shared";

/**
 * Shared rich game stats used by the family/multiplayer sidebar and the
 * library full-page game view.
 */
export function GameDetailStats({
  detail,
  showActions = true,
  showFriends = true,
  linkFriends = false,
  friendLimit = GAME_DETAIL_FRIEND_LIMIT,
  chartSize = "sm",
  playtimeHours,
  beforeFriends,
  className,
}: {
  detail: GameDetail;
  showActions?: boolean;
  showFriends?: boolean;
  linkFriends?: boolean;
  friendLimit?: number;
  chartSize?: "sm" | "lg";
  playtimeHours?: number;
  beforeFriends?: ReactNode;
  className?: string;
}) {
  const d = detail;
  const releaseLabel = formatReleaseDate(d.releaseDate);
  const deck = deckLabel(d.deckStatus);

  return (
    <div className={className ?? "space-y-8"}>
      {showActions && (
        <div className="flex flex-wrap gap-2">
          <a href={`steam://run/${d.appId}`} className="btn btn-primary flex-1">
            Play
          </a>
          <a
            href={`https://store.steampowered.com/app/${d.appId}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary flex-1"
          >
            Open on Steam →
          </a>
        </div>
      )}

      {(deck || releaseLabel || d.isFree) && (
        <div className="flex flex-wrap gap-2">
          {d.isFree ? <Chip>Free to Play</Chip> : null}
          {deck ? <Chip>{deck}</Chip> : null}
          {releaseLabel ? <Chip>{releaseLabel}</Chip> : null}
        </div>
      )}

      <GamePlayersSection detail={d} chartSize={chartSize} />

      {d.minPlayers != null && d.maxPlayers != null && (
        <section>
          <SectionTitle>Multiplayer</SectionTitle>
          <p className="text-sm text-[var(--muted)]">
            {d.minPlayers === d.maxPlayers
              ? `${d.maxPlayers} players`
              : `${d.minPlayers}–${d.maxPlayers} players`}
            <span className="mt-1 block font-mono text-[10px] text-[var(--faint)]">
              {d.playerCountSource === "igdb"
                ? "Source: IGDB"
                : d.playerCountSource === "steam_tag"
                  ? "Source: Steam store tag"
                  : "Trusted capacity data"}
            </span>
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

      {(d.developers?.length > 0 || d.publishers?.length > 0) && (
        <section>
          <SectionTitle>Studio</SectionTitle>
          {d.developers?.length ? (
            <p className="text-sm text-[var(--muted)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Dev
              </span>{" "}
              {d.developers.join(" · ")}
            </p>
          ) : null}
          {d.publishers?.length ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Pub
              </span>{" "}
              {d.publishers.join(" · ")}
            </p>
          ) : null}
        </section>
      )}

      {beforeFriends}

      {showFriends && (
        <GameFriendsSection
          detail={d}
          linkFriends={linkFriends}
          friendLimit={friendLimit}
        />
      )}

      <GameDetailCatalog
        detail={d}
        chartSize={chartSize}
        playtimeHours={playtimeHours}
      />
    </div>
  );
}
