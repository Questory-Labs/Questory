"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { GameTile } from "@/components/GameTile";
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
    <AppShell>
      <h1
        className="font-[family-name:var(--font-display)] text-4xl"
        style={{ fontWeight: 700 }}
      >
        {d?.friend.personaName || "Friend"}
      </h1>
      <p className="mt-2 text-[var(--muted)]">Library comparison</p>
      {d?.meta?.friendLibraryTruncated && (
        <p className="mt-2 font-mono text-[11px] text-[var(--warm)]">
          Friend library cache may be truncated (max{" "}
          {d.meta.gamesPerFriendLimit} games).
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Common games" value={d?.commonGames ?? "—"} />
        <StatCard label="Unique to you" value={d?.uniqueToYou ?? "—"} />
        <StatCard label="Unique to them" value={d?.uniqueToFriend ?? "—"} />
        <StatCard label="Mutual wishlist" value={d?.mutualWishlist ?? "—"} />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
          Challenge mode — both unplayed
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(d?.challengeGames || []).map((g) => (
            <GameTile key={g.appId} name={g.name} headerImage={g.headerImage} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
          Games in common
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(d?.commonGameList || []).map((g) => (
            <GameTile key={g.appId} name={g.name} headerImage={g.headerImage} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
