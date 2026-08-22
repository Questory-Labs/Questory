"use client";

import { GameTile } from "@/components/GameTile";
import { GAME_GRID_PAGE_SIZE } from "@/lib/pagination";
import {
  formatPlayerMaxLabel,
  type MultiplayerPlanGame,
} from "@questorylabs/shared";
import {
  Button,
  EmptyState,
  ResourceStatus,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import type { MultiplayerViewProps } from "../steam.multiplayer.types";
import { OwnershipBadge } from "./OwnershipBadge";

const playerMaxCorner = (g: MultiplayerPlanGame) => {
  const maxes = g.playerMaxes?.length
    ? g.playerMaxes
    : g.maxPlayers != null
      ? [g.maxPlayers]
      : null;
  const label = formatPlayerMaxLabel(maxes);
  if (!label) return undefined;
  return (
    <span
      className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-[var(--bg-0)] shadow-sm"
      title={
        g.playerCountSource === "igdb"
          ? "IGDB mode maxes"
          : g.playerCountSource === "steam_tag"
            ? "Steam tag"
            : undefined
      }
    >
      {label}
    </span>
  );
};

export const PlanResults = ({
  plan,
  pageGames,
  page,
  setPage,
  totalPages,
  setSelectedAppId,
}: Pick<
  MultiplayerViewProps,
  "plan" | "pageGames" | "page" | "setPage" | "totalPages" | "setSelectedAppId"
>) => {
  const games = plan.value?.games || [];

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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageGames.map((g, index) => (
            <GameTile
              key={`${g.isSuggested ? "s" : "o"}-${g.appId}`}
              name={g.name}
              headerImage={g.headerImage}
              index={index}
              onClick={() => setSelectedAppId(g.appId)}
              meta={[
                g.genres.slice(0, 2).join(", ") || null,
                g.releaseYear ? String(g.releaseYear) : null,
                g.reviewScore != null ? `★ ${g.reviewScore}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              corner={playerMaxCorner(g)}
              badge={
                g.isSuggested || g.ownership !== "shared" ? (
                  <OwnershipBadge
                    ownership={g.ownership}
                    ownedByYou={g.ownedByYou}
                    ownedByFriends={g.ownedByFriends}
                    missingFriends={g.missingFriends}
                    isSuggested={g.isSuggested}
                  />
                ) : undefined
              }
            />
          ))}
        </div>
        {plan.ready && !games.length && (
          <EmptyState title="No multiplayer titles found for this group. Try fewer friends, turn off strict matching, widen filters, or enable Suggested." />
        )}
        {games.length > GAME_GRID_PAGE_SIZE && (
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
    </ResourceStatus>
  );
};
