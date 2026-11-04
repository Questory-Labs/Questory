import Link from "next/link";
import type { LibraryEntry } from "@questorylabs/shared";
import { StoreBadgeRow } from "@/components/StoreBadge";
import { formatRelativePlayed } from "@/lib/dates";
import { CoverArt } from "./CoverArt";
import { LibraryStatusPill } from "./LibraryStatusPill";
import {
  achievementShare,
  formatEntryValue,
  formatHours,
} from "../steam.library.utils";

export const LibraryGameCard = ({
  entry,
  currency,
  index,
}: {
  entry: LibraryEntry;
  currency: string;
  index: number;
}) => {
  const stores = entry.stores || entry.game.stores || [];
  const value = formatEntryValue(entry, currency);
  const share = achievementShare(entry);
  return (
    <Link
      href={`/library/${entry.game.id}`}
      className="panel q-lift q-in group flex flex-col overflow-hidden"
      style={{ ["--i" as string]: Math.min(index + 3, 20) }}
    >
      <div className="relative aspect-[460/215] overflow-hidden border-b border-white/[0.06] bg-[var(--bg-1)]">
        <CoverArt
          src={entry.game.headerImage}
          seed={entry.game.id}
          className="absolute inset-0 transition-[transform,filter] duration-[1200ms] ease-[var(--ease-out)] group-hover:scale-[1.07] group-hover:brightness-125"
        />
        <LibraryStatusPill
          status={entry.userStatus ?? null}
          neverPlayed={entry.playtimeForever === 0}
          className="absolute left-2.5 top-2.5"
        />
        {stores.length ? (
          <div className="absolute right-2.5 top-2.5">
            <StoreBadgeRow stores={stores} />
          </div>
        ) : null}
        {value ? (
          <span className="absolute bottom-2.5 right-2.5 translate-y-1.5 rounded-full bg-[rgba(237,237,238,0.92)] px-2.5 py-0.5 text-[11px] font-medium text-[#0b0b0c] opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100">
            {value}
          </span>
        ) : null}
      </div>
      <div className="px-3.5 pb-3.5 pt-3">
        <h2 className="truncate text-[15px] font-normal">{entry.game.name}</h2>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="text-[28px] font-extralight tracking-[-0.03em]">
            {formatHours(entry.playtimeForever)}
            <span className="text-xs tracking-normal text-[var(--faint)]"> h</span>
          </p>
          <p className="font-mono text-[10px] text-[var(--faint)]">
            {entry.lastPlayedAt ? formatRelativePlayed(entry.lastPlayedAt) : "never"}
          </p>
        </div>
        {share != null ? (
          <>
            <div className="mt-2 h-0.5 rounded-sm bg-white/[0.07]">
              <div
                className="q-bar h-full rounded-sm bg-[var(--ink)]"
                style={{ width: `${Math.round(share * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--faint)]">
              {Math.round(share * 100)}% achievements
            </p>
          </>
        ) : (
          <p className="mt-2 truncate text-[11px] text-[var(--faint)]">
            {entry.game.genres.slice(0, 2).join(", ") || " "}
          </p>
        )}
      </div>
    </Link>
  );
};
