"use client";

import { ListPager } from "@/components/ListPager";
import { GAME_GRID_PAGE_SIZE } from "@/lib/pagination";
import {
  CountUp,
  EmptyState,
  ResourceStatus,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import { MODE_OPTIONS } from "../steam.multiplayer.constants";
import type { MultiplayerViewProps } from "../steam.multiplayer.types";
import { PlanCard } from "./PlanCard";

export const PlanResults = ({
  plan,
  pageGames,
  page,
  setPage,
  setSelectedAppId,
  filters,
}: Pick<
  MultiplayerViewProps,
  "plan" | "pageGames" | "page" | "setPage" | "setSelectedAppId" | "filters"
>) => {
  const games = plan.value?.games || [];
  const friendCount = plan.value?.friendCount ?? filters.selected.length;
  const modeLabel =
    MODE_OPTIONS.find((m) => m.value === filters.mode)?.label ?? "Any";
  const players = friendCount + 1;

  return (
    <ResourceStatus
      failed={plan.failed}
      empty={plan.empty}
      loading={<SkeletonTileGrid count={6} />}
      error={
        <EmptyState
          title={
            <span className="text-[var(--danger)]">
              Could not load multiplayer plan.
            </span>
          }
        />
      }
    >
      <>
        <div className="q-in flex items-baseline gap-3.5 px-1 pt-1.5 [--i:2]">
          <p className="text-[44px] leading-none font-extralight tracking-[-0.04em]">
            <CountUp value={games.length} />
          </p>
          <p className="text-sm text-[var(--muted)]">
            {games.length === 1 ? "match" : "matches"} · {players}{" "}
            {players === 1 ? "player" : "players"} · {modeLabel}
          </p>
        </div>
        {pageGames.length ? (
          <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(330px,100%),1fr))] gap-3.5">
            {pageGames.map((g, index) => (
              <PlanCard
                key={`${g.isSuggested ? "s" : "o"}-${g.appId}`}
                game={g}
                index={index}
                friendCount={friendCount}
                onSelect={setSelectedAppId}
              />
            ))}
          </ul>
        ) : null}
        {plan.ready && !games.length && (
          <EmptyState title="No multiplayer titles found for this group. Try fewer friends, turn off strict matching, widen filters, or enable Suggested." />
        )}
        <ListPager
          page={page}
          total={games.length}
          pageSize={GAME_GRID_PAGE_SIZE}
          onPageChange={setPage}
        />
      </>
    </ResourceStatus>
  );
};
