"use client";

import { useQuery } from "@questorylabs/qhttp/react";
import { StatCard } from "@/components/StatCard";
import { GameTile } from "@/components/GameTile";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { FriendCompare } from "@questorylabs/shared";
import { useParams } from "next/navigation";

export default function FriendComparePage() {
  const params = useParams<{ steamId: string }>();
  const compare = useQuery({
    queryKey: ["friend-compare", params.steamId],
    queryFn: () =>
      api<FriendCompare>(`/friends/${params.steamId}/compare`),
  });
  const d = compare.data;

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(d?.challengeGames || []).map((g) => (
            <GameTile key={g.appId} name={g.name} headerImage={g.headerImage} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">
          Games in common
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(d?.commonGameList || []).map((g) => (
            <GameTile key={g.appId} name={g.name} headerImage={g.headerImage} />
          ))}
        </div>
      </section>
    </>
  );
}
