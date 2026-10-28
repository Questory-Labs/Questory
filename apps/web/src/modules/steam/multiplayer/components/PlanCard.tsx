"use client";

import type { CSSProperties } from "react";
import {
  formatPlayerMaxLabel,
  type MultiplayerPlanGame,
} from "@questorylabs/shared";
import { DotCover } from "@questorylabs/ui";
import { planMetaLine, planOwnership } from "../steam.multiplayer.utils";
import { BADGE_TONE_CLASS, OwnershipBadge } from "./OwnershipBadge";

const PlayerMaxChip = ({ g }: { g: MultiplayerPlanGame }) => {
  const maxes = g.playerMaxes?.length
    ? g.playerMaxes
    : g.maxPlayers != null
      ? [g.maxPlayers]
      : null;
  const label = formatPlayerMaxLabel(maxes);
  if (!label) return null;
  return (
    <span
      className="absolute top-1.5 left-1.5 z-[1] rounded-md bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-[var(--bg-0)] shadow-sm"
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

export const PlanCard = ({
  game,
  index,
  friendCount,
  onSelect,
}: {
  game: MultiplayerPlanGame;
  index: number;
  friendCount: number;
  onSelect: (appId: number) => void;
}) => {
  const own = planOwnership(game, friendCount);
  const pipClass = BADGE_TONE_CLASS[own.tone];

  return (
    <li
      className="panel q-in group flex gap-4 overflow-hidden p-3 transition-[transform,border-color] duration-700 ease-[var(--ease-out)] hover:-translate-y-1.5 hover:border-white/[0.16] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ "--i": index + 3 } as CSSProperties}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => onSelect(game.appId)}
        className="relative aspect-[2/3] w-24 flex-none cursor-pointer overflow-hidden rounded-2xl border border-white/[0.06] bg-[#101012] p-0"
      >
        <PlayerMaxChip g={game} />
        {game.headerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.headerImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-1000 ease-[var(--ease-out)] group-hover:scale-[1.08] group-hover:brightness-125 motion-reduce:transition-none"
          />
        ) : (
          <DotCover seed={game.name} className="absolute inset-0" />
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1 pr-1">
        <button
          type="button"
          onClick={() => onSelect(game.appId)}
          className="cursor-pointer border-0 bg-transparent p-0 text-left text-base font-normal text-[var(--ink)] hover:underline"
        >
          {game.name}
        </button>
        <span className="font-mono text-[10px] text-[var(--faint)]">
          {planMetaLine(game)}
        </span>
        <span className="mt-auto flex items-center gap-1" aria-hidden="true">
          {Array.from({ length: own.partySize }, (_, i) => (
            <span
              key={i}
              className={`h-1 w-3.5 rounded-sm transition-[background-color,box-shadow] duration-500 motion-reduce:transition-none ${
                i < own.ownedCount
                  ? `${pipClass} bg-current shadow-[0_0_8px_currentColor]`
                  : "bg-white/10"
              }`}
            />
          ))}
        </span>
        <span className="text-[13px] text-[#a1a1a6]">{own.owners}</span>
        <OwnershipBadge label={own.badge} tone={own.tone} />
      </div>
    </li>
  );
};
