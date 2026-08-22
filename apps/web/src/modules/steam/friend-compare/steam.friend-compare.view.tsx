"use client";

import { StatCard } from "@/components/StatCard";
import { GameTile } from "@/components/GameTile";
import {
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonStatGrid,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import type { FriendCompareViewProps } from "./steam.friend-compare.types";

export const FriendCompareView = (props: Record<string, unknown>) => {
  const { compare } = props as FriendCompareViewProps;
  const d = compare.value;

  return (
    <>
      <PageHeader
        title={d?.friend.personaName || "Friend"}
        description={
          <>
            Library comparison
            {d?.meta?.friendLibraryTruncated ? (
              <p className="mt-2 font-mono text-[11px] text-[var(--warm)]">
                Friend library cache may be truncated (max{" "}
                {d.meta.gamesPerFriendLimit} games).
              </p>
            ) : null}
          </>
        }
      />

      <ResourceStatus
        failed={compare.failed}
        empty={compare.empty}
        loading={
          <>
            <SkeletonStatGrid count={4} />
            <SkeletonTileGrid count={4} className="mt-10" />
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
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Common games" value={d?.commonGames ?? "—"} />
            <StatCard label="Unique to you" value={d?.uniqueToYou ?? "—"} />
            <StatCard label="Unique to them" value={d?.uniqueToFriend ?? "—"} />
            <StatCard label="Mutual wishlist" value={d?.mutualWishlist ?? "—"} />
          </div>

          <section className="mt-10">
            <h2 className="mb-4 font-display text-xl font-bold tracking-tight">
              Challenge mode — both unplayed
            </h2>
            {(d?.challengeGames || []).length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(d?.challengeGames || []).map((g) => (
                  <GameTile
                    key={g.appId}
                    name={g.name}
                    headerImage={g.headerImage}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="No unplayed games in common." />
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-4 font-display text-xl font-bold tracking-tight">
              Games in common
            </h2>
            {(d?.commonGameList || []).length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(d?.commonGameList || []).map((g) => (
                  <GameTile
                    key={g.appId}
                    name={g.name}
                    headerImage={g.headerImage}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="No games in common yet." />
            )}
          </section>
        </>
      </ResourceStatus>
    </>
  );
};
