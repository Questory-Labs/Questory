"use client";

import { useResource } from "@questorylabs/qhttp/react";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { FRIENDS_PAGE_SIZE } from "@/lib/pagination";
import type { FriendsListResponse } from "@questorylabs/shared";
import Link from "next/link";
import { useState } from "react";

export default function FriendsPage() {
  const [page, setPage] = useState(1);
  const friends = useResource({
    id: ["friends", page],
    load: () =>
      api<FriendsListResponse>(
        `/friends?page=${page}&pageSize=${FRIENDS_PAGE_SIZE}`,
      ),
  });

  const list = friends.value?.friends || [];
  const meta = friends.value?.meta;
  const total = friends.value?.total ?? 0;
  const pageSize = friends.value?.pageSize ?? FRIENDS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Friends"
        description={
          <>
            <p>
              {total > 0
                ? `${total} friends · compare libraries and find mutual ground`
                : "Compare libraries and find mutual ground"}
            </p>
            {meta ? (
              <p className="mt-2 font-mono text-[11px] text-[var(--faint)]">
                {meta.librariesCached}/{meta.totalFriends} libraries cached
                {meta.truncated
                  ? ` · truncated (first ${meta.libraryCacheLimit} friends, ${meta.gamesPerFriendLimit} games each)`
                  : ""}
                {meta.lastSyncedAt
                  ? ` · synced ${new Date(meta.lastSyncedAt).toLocaleDateString()}`
                  : ""}
              </p>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((f) => (
          <Panel
            key={f.steamId}
            className="cursor-pointer transition hover:border-[var(--accent)]"
          >
            <Link
              href={`/friends/${f.steamId}`}
              className="flex items-center gap-3 p-4"
            >
              {f.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.avatarUrl}
                  alt=""
                  className="h-12 w-12 rounded-full"
                />
              )}
              <div>
                <div className="font-medium">{f.personaName}</div>
                <div className="text-xs text-[var(--muted)]">
                  {f.libraryCached
                    ? "Library cached · Compare"
                    : "Compare (no library cache)"}
                </div>
              </div>
            </Link>
          </Panel>
        ))}
        {!friends.empty && !total && (
          <p className="text-sm text-[var(--muted)]">
            No friends synced yet. Make sure your Steam friends list is public.
          </p>
        )}
      </div>

      {total > pageSize && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5"
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-[var(--muted)]">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5"
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
