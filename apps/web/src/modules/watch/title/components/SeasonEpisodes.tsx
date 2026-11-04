"use client";

import { useState } from "react";
import { cn } from "@questorylabs/ui";
import type { WatchTitleSeason } from "@questorylabs/shared";
import { formatDate } from "@/lib/dates";
import { PillSelect } from "@/modules/media/shelf/components/PillSelect";
import { defaultSeason } from "../watch.title.utils";

const seasonName = (s: WatchTitleSeason) => s.name || (s.seasonNumber === 0 ? "Specials" : `Season ${s.seasonNumber}`);

export const SeasonEpisodes = ({ seasons }: { seasons: WatchTitleSeason[] }) => {
  const [picked, setPicked] = useState<string | null>(null);
  const fallback = defaultSeason(seasons);
  const current =
    seasons.find((s) => String(s.seasonNumber) === picked) ??
    seasons.find((s) => s.seasonNumber === fallback) ??
    seasons[0];
  if (!current) return null;
  const total = current.episodeCount ?? current.episodes.length;

  return (
    <section
      aria-labelledby="watch-eps"
      className="q-in q-lift min-w-0 flex-[2_1_520px] rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.016] px-3 pb-2.5 pt-[18px] [--i:2]"
    >
      <div className="mx-2 mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="watch-eps" className="m-0 text-[17px] font-normal">
          {seasonName(current)}
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[var(--muted)]">
            {current.watchedEpisodes} / {total} watched
          </span>
          {seasons.length > 1 ? (
            <PillSelect
              label="Season"
              value={String(current.seasonNumber)}
              options={seasons.map((s) => ({ value: String(s.seasonNumber), label: seasonName(s) }))}
              onChange={setPicked}
            />
          ) : null}
        </div>
      </div>
      {current.episodes.length ? (
        <ol className="m-0 list-none p-0">
          {current.episodes.map((e) => {
            const seen = e.watchCount > 0;
            return (
              <li
                key={e.episodeNumber}
                className="q-row flex min-h-[50px] items-center gap-3.5 rounded-[14px] px-2 hover:bg-white/[0.04]"
              >
                <span
                  aria-label={seen ? "Watched" : "Not watched"}
                  role="img"
                  className={cn(
                    "grid h-[22px] w-[22px] flex-none place-items-center rounded-full border text-[#0a0a0b]",
                    seen
                      ? "border-[var(--watch)] bg-[var(--watch)] shadow-[0_0_10px_rgba(230,194,122,0.5)]"
                      : "border-white/20",
                  )}
                >
                  {seen ? (
                    <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  ) : null}
                </span>
                <span className="w-[34px] font-mono text-[11px] text-[var(--faint)]">E{e.episodeNumber}</span>
                <span className={cn("min-w-0 flex-1 truncate", seen ? "text-[var(--ink)]" : "text-[var(--muted)]")}>
                  {e.name ?? `Episode ${e.episodeNumber}`}
                </span>
                <span className="font-mono text-[11px] text-[var(--muted)]">
                  {e.lastWatchedAt
                    ? formatDate(e.lastWatchedAt)
                    : e.runtimeMinutes
                      ? `${e.runtimeMinutes}m`
                      : e.airDate
                        ? formatDate(e.airDate)
                        : ""}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mx-2 text-sm text-[var(--muted)]">No episode list for this season yet.</p>
      )}
    </section>
  );
};
