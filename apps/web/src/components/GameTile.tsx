"use client";

import { motion } from "framer-motion";
import { GameCover } from "@/components/GameCover";
import { HatchShadow } from "@/components/HatchShadow";
import type { ReactNode } from "react";

export function GameTile({
  name,
  headerImage,
  meta,
  index = 0,
  badge,
  corner,
  onClick,
}: {
  name: string;
  headerImage: string | null;
  meta?: string;
  index?: number;
  badge?: ReactNode;
  /** Small chip overlaid on the poster (e.g. player count). */
  corner?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <HatchShadow
      size="sm"
      className="h-full"
      faceClassName={`group panel flex h-full flex-col hover:border-[var(--line-strong)] ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <GameCover
        src={headerImage}
        className="min-h-0 w-full grow"
        imgClassName="transition duration-500 group-hover:scale-[1.03]"
      >
        {corner ? (
          <div className="pointer-events-none absolute top-2 right-2 z-[1]">
            {corner}
          </div>
        ) : null}
        {badge ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-2.5 pb-2 pt-8">
            {badge}
          </div>
        ) : null}
      </GameCover>
      <div className="shrink-0 border-t border-[var(--line)] px-3 py-2.5">
        <div className="truncate text-sm font-medium text-[var(--ink)]">
          {name}
        </div>
        {meta && (
          <div className="font-mono mt-1 text-[11px] text-[var(--muted)]">
            {meta}
          </div>
        )}
      </div>
    </HatchShadow>
  );

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: 0.08 + Math.min(index, 12) * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="block h-full w-full text-left"
        >
          {body}
        </button>
      ) : (
        body
      )}
    </motion.div>
  );
}
