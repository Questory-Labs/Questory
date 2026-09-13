"use client";

import type { GameDetail } from "@questorylabs/shared";
import { GAME_DETAIL_FRIEND_LIMIT } from "./game-detail.constants";
import { OwnerRow, SectionTitle } from "./game-detail-shared";

export const GameFriendsSection = ({
  detail,
  linkFriends = false,
  friendLimit = GAME_DETAIL_FRIEND_LIMIT,
}: {
  detail: GameDetail;
  linkFriends?: boolean;
  friendLimit?: number;
}) => (
  <section>
    <SectionTitle>Friends who own it</SectionTitle>
    {detail.friendOwners.length ? (
      <div className="divide-y divide-[var(--line)]">
        {detail.friendOwners.slice(0, friendLimit).map((o) => (
          <OwnerRow
            key={o.steamId}
            personaName={o.personaName}
            avatarUrl={o.avatarUrl}
            playtimeHours={o.playtimeHours}
            href={linkFriends ? `/friends/${o.steamId}` : undefined}
          />
        ))}
      </div>
    ) : (
      <p className="text-sm text-[var(--muted)]">
        No synced friends own this yet.
      </p>
    )}
  </section>
);
