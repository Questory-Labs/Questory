"use client";

import type { CSSProperties } from "react";
import {
  CountUp,
  EmptyState,
  ResourceStatus,
  SkeletonStatGrid,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import { ChallengeCard } from "./components/ChallengeCard";
import { CommonGamesTable } from "./components/CommonGamesTable";
import { CompareHero } from "./components/CompareHero";
import type { FriendCompareViewProps } from "./steam.friend-compare.types";

const STAT_DOTS = [
  "text-[var(--ink)]",
  "text-[var(--accent)]",
  "text-[var(--music)]",
  "text-[var(--warm)]",
];

export const FriendCompareView = (props: Record<string, unknown>) => {
  const { compare } = props as FriendCompareViewProps;
  const d = compare.value;

  const stats = d
    ? [
        { label: "Common games", value: d.commonGames },
        { label: "Only you", value: d.uniqueToYou },
        { label: "Only them", value: d.uniqueToFriend },
        { label: "Mutual wishlist", value: d.mutualWishlist },
      ]
    : [];

  return (
    <ResourceStatus
      failed={compare.failed}
      empty={compare.empty}
      loading={
        <>
          <SkeletonStatGrid count={4} />
          <SkeletonTileGrid count={4} className="mt-4" />
        </>
      }
      error={
        <EmptyState
          title={
            <span className="text-[var(--danger)]">
              Could not load friend comparison.
            </span>
          }
        />
      }
    >
      {d ? (
        <div className="flex flex-col gap-4">
          <CompareHero data={d} />

          {d.meta && !d.meta.friendLibraryCached ? (
            <p className="px-1 font-mono text-[11px] text-[var(--warm)]">
              {d.friend.personaName}&apos;s library isn&apos;t cached yet
              (private profile or not synced), so overlap is incomplete.
            </p>
          ) : null}
          {d.meta?.friendLibraryTruncated ? (
            <p className="px-1 font-mono text-[11px] text-[var(--warm)]">
              Friend library cache may be truncated (max{" "}
              {d.meta.gamesPerFriendLimit} games).
            </p>
          ) : null}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="panel q-lift q-in px-[18px] py-4"
                style={{ "--i": 3 + i } as CSSProperties}
              >
                <p className="flex items-center gap-[7px] text-[13px] text-[var(--muted)]">
                  <span
                    aria-hidden="true"
                    className={`dot h-[5px] w-[5px] ${STAT_DOTS[i]}`}
                  />
                  {s.label}
                </p>
                <p className="mt-2.5 text-[40px] leading-none font-extralight tracking-[-0.035em]">
                  <CountUp value={s.value} />
                </p>
              </div>
            ))}
          </div>

          <ChallengeCard games={d.challengeGames} />

          <CommonGamesTable
            games={d.commonGameList}
            friendName={d.friend.personaName}
          />
        </div>
      ) : null}
    </ResourceStatus>
  );
};
