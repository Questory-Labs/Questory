"use client";

import { CountUp, EmptyState, Panel } from "@questorylabs/ui";
import { FriendCompareView } from "../friend-compare/steam.friend-compare.view";
import { FriendsListPanel } from "./components/FriendsListPanel";
import type { FriendsViewProps } from "./steam.friends.types";

export const FriendsView = (props: Record<string, unknown>) => {
  const viewProps = props as FriendsViewProps;
  const { friends, activeSteamId, compare } = viewProps;
  const meta = friends.value?.meta;
  const total = meta?.totalFriends ?? friends.value?.total ?? 0;
  const online = meta?.onlineCount;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <header className="q-in px-1 pt-2 pb-1">
        {online != null ? (
          <p className="label-mono flex items-center gap-2 !text-[11px]">
            <span
              aria-hidden="true"
              className="dot q-live h-[5px] w-[5px] text-[var(--ok)]"
            />
            <CountUp value={online} /> online now
          </p>
        ) : null}
        <h1 className="mt-1.5 text-[clamp(34px,4vw,52px)] leading-none font-light tracking-[-0.035em]">
          {total > 0 ? (
            <>
              <CountUp value={total} /> friends,{" "}
            </>
          ) : (
            "Friends, "
          )}
          <span className="font-serif text-[#a1a1a6]">one shared shelf</span>
        </h1>
        {meta ? (
          <p className="mt-2 font-mono text-[11px] text-[var(--faint)]">
            {meta.librariesCached}/{meta.totalFriends} libraries cached
            {meta.truncated
              ? ` · truncated (up to ${meta.libraryCacheLimit} friends, ${meta.gamesPerFriendLimit} games each)`
              : ""}
            {meta.lastSyncedAt
              ? ` · synced ${new Date(meta.lastSyncedAt).toLocaleDateString()}`
              : ""}
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap items-start gap-4">
        <FriendsListPanel {...viewProps} />
        <section
          aria-label="Library comparison"
          className="flex min-w-0 flex-[2_1_560px] flex-col gap-4"
        >
          {activeSteamId ? (
            <FriendCompareView compare={compare} />
          ) : friends.ready ? (
            <Panel className="p-6">
              <EmptyState title="Pick a friend to compare libraries." />
            </Panel>
          ) : null}
        </section>
      </div>
    </div>
  );
};
