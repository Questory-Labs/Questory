"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import type { FriendsListResponse } from "@questorylabs/shared";
import Link from "next/link";

export default function FriendsPage() {
  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => api<FriendsListResponse>("/friends"),
  });

  const list = friends.data?.friends || [];
  const meta = friends.data?.meta;

  return (
    <AppShell>
      <h1
        className="font-[family-name:var(--font-display)] text-4xl"
        style={{ fontWeight: 700 }}
      >
        Friends
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Compare libraries and find mutual ground
      </p>

      {meta && (
        <p className="mt-3 font-mono text-[11px] text-[var(--faint)]">
          {meta.librariesCached}/{meta.totalFriends} libraries cached
          {meta.truncated
            ? ` · truncated (first ${meta.libraryCacheLimit} friends, ${meta.gamesPerFriendLimit} games each)`
            : ""}
          {meta.lastSyncedAt
            ? ` · synced ${new Date(meta.lastSyncedAt).toLocaleDateString()}`
            : ""}
        </p>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((f) => (
          <Link
            key={f.steamId}
            href={`/friends/${f.steamId}`}
            className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[rgba(26,40,54,0.45)] p-4 transition hover:border-[var(--accent)]"
          >
            {f.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.avatarUrl} alt="" className="h-12 w-12 rounded-full" />
            )}
            <div>
              <div className="font-medium">{f.personaName}</div>
              <div className="text-xs text-[var(--muted)]">
                {f.libraryCached ? "Library cached · Compare" : "Compare (no library cache)"}
              </div>
            </div>
          </Link>
        ))}
        {!friends.isLoading && !list.length && (
          <p className="text-sm text-[var(--muted)]">
            No friends synced yet. Make sure your Steam friends list is public, then refresh.
          </p>
        )}
      </div>
    </AppShell>
  );
}
