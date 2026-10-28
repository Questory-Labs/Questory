"use client";

import { useMemo } from "react";
import type { Friend } from "@questorylabs/shared";
import {
  EmptyState,
  ResourceStatus,
  SkeletonListRows,
} from "@questorylabs/ui";
import { PARTY_PICKER_LIMIT } from "../steam.multiplayer.constants";
import type { MultiplayerViewProps } from "../steam.multiplayer.types";

const chipBase =
  "inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-full py-0 pr-4 pl-1.5 text-sm font-normal transition-[background-color,color,border-color,transform] duration-[400ms] active:scale-[0.96] motion-reduce:transition-none";

const Avatar = ({ name, url }: { name: string; url: string | null }) =>
  url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-7 w-7 rounded-full object-cover" />
  ) : (
    <span
      aria-hidden="true"
      className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(140deg,#3a3a3f,#1b1b1e)] text-xs font-medium"
    >
      {(name.trim().charAt(0) || "?").toUpperCase()}
    </span>
  );

export const PartyPicker = ({
  friends,
  filters,
}: Pick<MultiplayerViewProps, "friends" | "filters">) => {
  const friendList = friends.value?.friends || [];
  const { filteredFriends, selected, friendFilter } = filters;

  const visible = useMemo(() => {
    const selectedSet = new Set(selected);
    const picked = friendList.filter((f) => selectedSet.has(f.steamId));
    const rest = filteredFriends
      .filter((f) => !selectedSet.has(f.steamId))
      .sort(
        (a, b) =>
          Number((b.personaState ?? 0) > 0) - Number((a.personaState ?? 0) > 0),
      )
      .slice(0, PARTY_PICKER_LIMIT);
    return [...picked, ...rest];
  }, [friendList, filteredFriends, selected]);

  const hidden = Math.max(
    0,
    filteredFriends.filter((f) => !selected.includes(f.steamId)).length -
      PARTY_PICKER_LIMIT,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label-mono w-16">Playing</span>
      <span className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-white/[0.16] bg-white/10 py-0 pr-4 pl-1.5 text-sm font-normal">
        <span
          aria-hidden="true"
          className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(140deg,#8fd6c4,#3c6a5f)] text-xs font-medium text-[#08130f]"
        >
          Y
        </span>
        You
      </span>
      <ResourceStatus
        failed={friends.failed}
        empty={friends.empty}
        loading={<SkeletonListRows count={1} />}
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
        <>
          {visible.map((f: Friend) => {
            const on = selected.includes(f.steamId);
            return (
              <button
                key={f.steamId}
                type="button"
                aria-pressed={on}
                onClick={() => filters.toggle(f.steamId)}
                className={`${chipBase} ${
                  on
                    ? "border border-white/[0.16] bg-white/10 text-[var(--ink)]"
                    : "border border-white/[0.06] bg-black/20 text-[#7a7a7f] hover:border-white/[0.22]"
                }`}
              >
                <Avatar name={f.personaName} url={f.avatarUrl} />
                <span className="max-w-[10rem] truncate">{f.personaName}</span>
              </button>
            );
          })}
          {friendList.length > 0 ? (
            <label className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-white/[0.08] bg-black/25 px-4 text-[13px] text-[var(--muted)]">
              <span className="sr-only">Search friends</span>
              <input
                type="search"
                value={friendFilter}
                onChange={(e) => filters.setFriendFilter(e.target.value)}
                placeholder={
                  hidden > 0 ? `Search ${hidden} more friends…` : "Search friends…"
                }
                className="w-44 min-w-0 border-0 bg-transparent text-[13px] text-[var(--ink)] outline-0"
              />
            </label>
          ) : null}
          {!friendList.length && (
            <p className="text-xs text-[var(--faint)]">
              Sync friends to intersect libraries.
            </p>
          )}
          {friendList.length > 0 && !filteredFriends.length && (
            <p className="text-xs text-[var(--faint)]">
              No friends match “{friendFilter.trim()}”.
            </p>
          )}
        </>
      </ResourceStatus>
    </div>
  );
};
