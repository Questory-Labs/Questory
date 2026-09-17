"use client";

import { GameCover } from "@/components/GameCover";
import { HatchShadow } from "@/components/HatchShadow";
import type { ReactNode } from "react";

export function GameTile({
  name,
  headerImage,
  meta,
  badge,
  corner,
  onClick,
}: {
  name: string;
  headerImage: string | null;
  meta?: string;
  /** @deprecated Unused; kept so existing call sites compile. */
  index?: number;
  badge?: ReactNode;
  /** Small chip overlaid on the poster (e.g. player count). */
  corner?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <HatchShadow
      size="sm"
      faceClassName={`group panel flex flex-col hover:border-[var(--line-strong)] ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <GameCover
        src={headerImage}
        className="w-full"
        imgClassName="transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      >
        {corner ? (
          <div className="pointer-events-none absolute top-2 right-2 z-[1]">
            {corner}
          </div>
        ) : null}
      </GameCover>
      <div className="shrink-0 border-t border-[var(--line)] px-3 py-2.5">
        <div className="truncate text-sm font-medium text-[var(--ink)]">
          {name}
        </div>
        {badge ? <div className="mt-1.5">{badge}</div> : null}
        {meta && (
          <div className="font-mono mt-1 text-[11px] text-[var(--muted)]">
            {meta}
          </div>
        )}
      </div>
    </HatchShadow>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left"
      >
        {body}
      </button>
    );
  }

  return body;
}
