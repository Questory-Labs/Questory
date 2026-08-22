"use client";

import { GameTile } from "@/components/GameTile";
import type {
  FamilyInsights,
  FamilyLibrary,
  FamilyMemberSummary,
} from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { Dispatch, SetStateAction } from "react";
import {
  Button,
  EmptyState,
  ResourceStatus,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import { memberLabel } from "../steam.family.utils";

export const FamilyLibrarySection = ({
  insights,
  library,
  members,
  activeMember,
  setActiveMember,
  gameSearch,
  setGameSearch,
  page,
  setPage,
  money,
  setSelectedAppId,
}: {
  insights: UseResourceResult<FamilyInsights>;
  library: UseResourceResult<FamilyLibrary>;
  members: FamilyMemberSummary[];
  activeMember: string;
  setActiveMember: (id: string) => void;
  gameSearch: string;
  setGameSearch: (value: string) => void;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  money: (n: number | null | undefined) => string;
  setSelectedAppId: (appId: number | null) => void;
}) => {
  const totalPages = library.value
    ? Math.max(1, Math.ceil(library.value.total / library.value.pageSize))
    : 1;

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Family shareable games
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {library.empty
              ? "Loading…"
              : `${library.value?.total ?? 0} games · click a poster for stats`}
          </p>
        </div>
        <input
          value={gameSearch}
          onChange={(e) => setGameSearch(e.target.value)}
          placeholder="Search games"
          className="min-w-[220px] rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveMember("all")}
          className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${
            activeMember === "all"
              ? "bg-[var(--accent)] font-semibold text-[var(--bg-0)]"
              : "border border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
          }`}
        >
          All
        </button>
        {members.map((m) => (
          <button
            key={m.steamId}
            type="button"
            onClick={() => setActiveMember(m.steamId)}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
              activeMember === m.steamId
                ? "bg-[var(--accent)] font-semibold text-[var(--bg-0)]"
                : "border border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
            }`}
          >
            {m.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.avatarUrl}
                alt=""
                className="h-5 w-5 rounded-full"
              />
            ) : null}
            {memberLabel(m)}
          </button>
        ))}
      </div>

      {!insights.empty && !members.length ? (
        <EmptyState title="No members yet. Import friends or add a SteamID64 above." />
      ) : null}

      <ResourceStatus
        failed={library.failed}
        empty={library.empty}
        loading={<SkeletonTileGrid count={8} />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load family games.
              </span>
            }
          />
        }
      >
        {library.value && library.value.total === 0 ? (
          <EmptyState
            title="No shareable games for this filter. Sync libraries or try another member."
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(library.value?.items || []).map((item, index) => (
                <GameTile
                  key={item.appId}
                  name={item.name}
                  headerImage={item.headerImage}
                  index={index}
                  onClick={() => setSelectedAppId(item.appId)}
                  badge={
                    <div className="flex items-end justify-between gap-2 text-[11px] text-[var(--ink)]">
                      <span className="font-medium">
                        {item.ownerCount} family
                        {item.ownerCount === 1 ? " owner" : " owners"}
                      </span>
                      <span className="font-mono text-[10px] text-white/75">
                        {item.familyPlaytimeHours}h
                      </span>
                    </div>
                  }
                  meta={
                    item.currentPrice != null
                      ? `${money(item.currentPrice)}${
                          item.lowestPrice != null
                            ? ` · low ${money(item.lowestPrice)}`
                            : ""
                        }`
                      : item.owners
                          .slice(0, 2)
                          .map((o) =>
                            o.isMe ? `${o.personaName} (me)` : o.personaName,
                          )
                          .join(" · ") || undefined
                  }
                />
              ))}
            </div>

            {library.value && library.value.total > library.value.pageSize ? (
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
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5"
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        )}
      </ResourceStatus>
    </section>
  );
};
