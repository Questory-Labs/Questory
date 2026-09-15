"use client";

import Link from "next/link";
import type { GameDetail, LibraryEntry } from "@questorylabs/shared";
import { GameCover } from "@/components/GameCover";
import { StoreBadge, StoreBadgeRow } from "@/components/StoreBadge";
import {
  Chip,
  deckLabel,
  formatReleaseDate,
} from "@/components/game-detail/game-detail-shared";
import { PageHeader, Panel } from "@questorylabs/ui";
import { LIBRARY_GAME_COVER_CLASS } from "../steam.library-game.constants";
import {
  formatHours,
  hoursCaption,
  playtimeHours,
  studioLine,
} from "../steam.library-game.utils";

export const LibraryGameHero = ({
  entry,
  detail,
}: {
  entry: LibraryEntry;
  detail?: GameDetail;
}) => {
  const stores = entry.stores || entry.game.stores || [];
  const name = entry.game.name || detail?.name;
  const appId = entry.game.appId;
  const hasSteam = stores.includes("steam") || (appId != null && appId > 0);
  const hours = playtimeHours(entry.playtimeForever);
  const unplayed = entry.playtimeForever <= 0;
  const genres = (
    entry.game.genres.length ? entry.game.genres : detail?.genres || []
  ).slice(0, 4);
  const studio = studioLine(detail ?? entry.game);
  const description = [genres.join(" · "), studio].filter(Boolean).join(" · ");
  const deck = deckLabel(detail?.deckStatus ?? entry.game.deckStatus);
  const releaseLabel = formatReleaseDate(
    detail?.releaseDate ?? entry.game.releaseDate,
  );
  const isFree = detail?.isFree ?? entry.game.isFree;

  const otherStoreActions = (entry.ownerships || []).flatMap((o) => {
    if (o.store === "steam") return [];
    const url =
      o.listing?.storeUrl ||
      entry.game.listings?.find((l) => l.store === o.store)?.storeUrl;
    if (!url) return [];
    return [
      <a
        key={o.store}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="btn btn-secondary gap-2 text-[var(--accent)]"
      >
        <StoreBadge store={o.store} compact />
        Open store →
      </a>,
    ];
  });
  const steamActions =
    hasSteam && appId != null && appId > 0
      ? [
          <a
            key="play"
            href={`steam://run/${appId}`}
            className="btn btn-primary"
            aria-label={`Play ${name}`}
          >
            Play
          </a>,
          <a
            key="store"
            href={`https://store.steampowered.com/app/${appId}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            Open on Steam →
          </a>,
        ]
      : [];
  const actions =
    steamActions.length || otherStoreActions.length ? (
      <>
        {steamActions}
        {otherStoreActions}
      </>
    ) : undefined;

  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
        <Link href="/library" className="hover:text-[var(--accent)]">
          Library
        </Link>
      </p>
      <PageHeader
        size="sm"
        title={name}
        description={description || undefined}
        actions={actions}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,36rem)_1fr]">
        <Panel size="lg" className={`overflow-hidden ${LIBRARY_GAME_COVER_CLASS}`}>
          <GameCover
            src={entry.game.headerImage || detail?.headerImage || null}
            className="w-full"
          />
        </Panel>

        <Panel size="lg" className="p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            Your playtime
          </p>
          <p className="mt-2 font-display text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">
            {formatHours(hours)}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            {hoursCaption({
              lastPlayedAt: entry.lastPlayedAt,
              playtime2Weeks: entry.playtime2Weeks,
              stores,
              unplayed,
            })}
          </p>
          {(deck || releaseLabel || isFree || entry.isFamilyShared) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {isFree ? <Chip>Free to Play</Chip> : null}
              {deck ? <Chip>{deck}</Chip> : null}
              {releaseLabel ? <Chip>{releaseLabel}</Chip> : null}
              {entry.isFamilyShared ? <Chip>Family shared</Chip> : null}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
};
