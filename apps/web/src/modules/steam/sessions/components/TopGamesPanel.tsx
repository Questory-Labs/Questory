"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { PlaySessionTopGame } from "@questorylabs/shared";
import { cn } from "@questorylabs/ui";
import { GameCover } from "@/components/GameCover";
import { formatSessionDuration } from "./session-format";

export const TopGamesPanel = ({ games }: { games: PlaySessionTopGame[] }) => {
  const max = Math.max(...games.map((g) => g.durationSecs), 1);
  return (
    <section
      aria-labelledby="sessions-top"
      className="panel q-in min-w-0 flex-[1_1_300px] px-[22px] py-5"
      style={{ "--i": 6 } as CSSProperties}
    >
      <h2 id="sessions-top" className="m-0 text-[17px] font-normal">
        Top games
      </h2>
      {games.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">No play in this window.</p>
      ) : (
        <ol className="mt-4 flex list-none flex-col gap-4 p-0">
          {games.map((game, i) => {
            const pct = Math.max(2, Math.round((game.durationSecs / max) * 100));
            return (
              <li key={game.key} className="flex items-center gap-3">
                <GameCover
                  src={game.headerImage}
                  className="w-12 shrink-0 rounded-md"
                  fallback="—"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-baseline">
                      <span className="mr-2 font-mono text-[10px] text-[var(--dim)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {game.gameId ? (
                        <Link
                          href={`/library/${game.gameId}`}
                          className="truncate hover:text-[var(--accent)]"
                        >
                          {game.name}
                        </Link>
                      ) : (
                        <span className="truncate">{game.name}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[#a1a1a6]">
                      {formatSessionDuration(game.durationSecs)}
                    </span>
                  </div>
                  <div aria-hidden="true" className="mt-[7px] h-[3px] rounded-sm bg-white/[0.06]">
                    <div
                      className={cn(
                        "q-bar h-[3px] rounded-sm",
                        i === 0
                          ? "bg-[var(--ink)] shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                          : "bg-[var(--muted)]",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
