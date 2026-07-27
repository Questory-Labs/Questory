"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import type { FriendsListResponse } from "@questorylabs/shared";
import Link from "next/link";

const PAGE_SIZE = 48;

export default function FriendsPage() {
  const [page, setPage] = useState(1);
  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => api<FriendsListResponse>("/friends"),
  });

  const list = friends.data?.friends || [];
  const meta = friends.data?.meta;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, page]);

  return (
    <>
      <PageHeader
        title="Friends"
        description={
          <>
            <p>Compare libraries and find mutual ground</p>
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
        {pageItems.map((f) => (
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
        {!friends.isLoading && !list.length && (
          <p className="text-sm text-[var(--muted)]">
            No friends synced yet. Make sure your Steam friends list is public.
          </p>
        )}
      </div>

      {list.length > PAGE_SIZE && (
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
