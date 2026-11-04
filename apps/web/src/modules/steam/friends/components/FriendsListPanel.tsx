"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { Friend } from "@questorylabs/shared";
import {
  EmptyState,
  ResourceStatus,
  SkeletonListRows,
} from "@questorylabs/ui";
import { ListPager } from "@/components/ListPager";
import {
  PRESENCE_DOT_CLASS,
  friendInitial,
  friendPresence,
} from "../steam.friends.utils";
import type { FriendsViewProps } from "../steam.friends.types";

const FriendRow = ({
  friend,
  index,
  active,
  onSelect,
}: {
  friend: Friend;
  index: number;
  active: boolean;
  onSelect: (steamId: string) => void;
}) => {
  const presence = friendPresence(friend);
  const status = [
    presence?.label,
    friend.libraryCached === false ? "No library cache" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className={`q-row q-in flex min-h-14 items-center gap-3 rounded-2xl px-3 ${
        active ? "bg-white/[0.07]" : ""
      }`}
      style={{ "--i": index + 2 } as CSSProperties}
    >
      <span className="relative grid h-9 w-9 flex-none place-items-center rounded-full bg-[linear-gradient(140deg,#3a3a3f,#1b1b1e)] text-[13px] font-medium">
        {friend.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={friend.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          friendInitial(friend.personaName)
        )}
        {presence ? (
          <span
            aria-hidden="true"
            className={`dot absolute -right-px -bottom-px h-[9px] w-[9px] border-2 border-[#121214] ${PRESENCE_DOT_CLASS[presence.tone]} ${
              presence.live ? "q-live" : ""
            }`}
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-normal">{friend.personaName}</span>
        {status ? (
          <span className="block truncate text-xs text-[var(--muted)]">
            {status}
          </span>
        ) : null}
      </span>
      <Link
        href={`/friends/${friend.steamId}`}
        aria-current={active ? "true" : undefined}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          onSelect(friend.steamId);
        }}
        className="inline-flex min-h-8 items-center rounded-full border border-white/[0.12] px-3 text-xs no-underline opacity-55 transition-[opacity,transform] duration-500 hover:translate-x-0.5 hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none"
      >
        Compare
      </Link>
    </li>
  );
};

export const FriendsListPanel = ({
  friends,
  page,
  setPage,
  query,
  setQuery,
  search,
  activeSteamId,
  selectFriend,
}: Pick<
  FriendsViewProps,
  | "friends"
  | "page"
  | "setPage"
  | "query"
  | "setQuery"
  | "search"
  | "activeSteamId"
  | "selectFriend"
>) => {
  const list = friends.value?.friends ?? [];
  const total = friends.value?.total ?? 0;
  const pageSize = friends.value?.pageSize ?? 15;

  return (
    <section
      aria-labelledby="friends-list-title"
      className="panel q-in min-w-0 flex-[1_1_300px] px-2.5 pt-4 pb-2.5 [--i:1]"
    >
      <h2 id="friends-list-title" className="label-mono mx-2">
        Steam friends
      </h2>
      <label className="mx-1 mt-3 mb-2 flex min-h-11 items-center gap-2 rounded-full border border-white/[0.08] bg-black/25 px-4 text-[var(--muted)]">
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="sr-only">Search friends</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search friends"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-light text-[var(--ink)] outline-0"
        />
      </label>
      <ResourceStatus
        failed={friends.failed}
        empty={friends.empty}
        loading={<SkeletonListRows count={7} />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load friends.
              </span>
            }
          />
        }
      >
        {list.length ? (
          <ul className="flex flex-col gap-0.5">
            {list.map((f, i) => (
              <FriendRow
                key={f.steamId}
                friend={f}
                index={i}
                active={f.steamId === activeSteamId}
                onSelect={selectFriend}
              />
            ))}
          </ul>
        ) : search ? (
          <p className="px-3 py-6 text-sm text-[var(--muted)]">
            No friends match &ldquo;{search}&rdquo;.
          </p>
        ) : (
          <EmptyState title="No friends synced yet. Make sure your Steam friends list is public." />
        )}
      </ResourceStatus>
      <ListPager
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        className="mt-3 mb-1"
      />
    </section>
  );
};
