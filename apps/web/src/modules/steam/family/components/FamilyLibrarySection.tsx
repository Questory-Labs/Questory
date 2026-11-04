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
import { FamilyMemberAvatar } from "./FamilyMemberAvatar";

const chip = (active: boolean) =>
  `flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors duration-300 ${
    active
      ? "border-white/[0.16] bg-white/[0.1] text-[var(--ink)]"
      : "border-white/[0.08] bg-black/20 text-[var(--muted)] hover:border-white/[0.22] hover:text-[var(--ink)]"
  }`;

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
    <section aria-labelledby="family-library-heading" className="q-in mt-2">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <h2 id="family-library-heading" className="text-[17px] font-normal">
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
          aria-label="Search family games"
          className="min-h-10 min-w-[220px] rounded-full border border-white/[0.08] bg-black/25 px-4 text-sm text-[var(--ink)] outline-none focus:border-white/[0.28]"
        />
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setActiveMember("all")}
          aria-pressed={activeMember === "all"}
          className={chip(activeMember === "all")}
        >
          All
        </button>
        {members.map((m, index) => (
          <button
            key={m.steamId}
            type="button"
            onClick={() => setActiveMember(m.steamId)}
            aria-pressed={activeMember === m.steamId}
            className={chip(activeMember === m.steamId)}
          >
            <FamilyMemberAvatar
              name={m.personaName}
              avatarUrl={m.avatarUrl}
              index={index}
              size="sm"
            />
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
                      : (item.owners ?? [])
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
                  size="sm"
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
                  size="sm"
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
