"use client";

import Link from "next/link";
import type { GameDetail, LibraryEntry, LibraryUserStatus } from "@questorylabs/shared";
import { StoreBadge } from "@/components/StoreBadge";
import {
  deckLabel,
  formatReleaseDate,
} from "@/components/game-detail/game-detail-shared";
import { formatMoney } from "@/lib/money";
import { ProgressRing } from "@questorylabs/ui";
import { CoverArt } from "../../library/components/CoverArt";
import {
  costPerHour,
  formatHours,
  hoursCaption,
  playtimeHours,
  studioLine,
} from "../steam.library-game.utils";
import { LibraryGameStatusSelect } from "./LibraryGameStatusSelect";

const chip =
  "rounded-full border border-white/[0.12] bg-[rgba(10,10,11,0.6)] px-[11px] py-1 text-[var(--muted)] backdrop-blur-md";

export const LibraryGameHero = ({
  entry,
  detail,
  status,
  statusBusy,
  onStatusChange,
}: {
  entry: LibraryEntry;
  detail?: GameDetail;
  status?: LibraryUserStatus | null;
  statusBusy?: boolean;
  onStatusChange?: (status: LibraryUserStatus | null) => void;
}) => {
  const stores = entry.stores || entry.game.stores || [];
  const name = entry.game.name || detail?.name;
  const appId = entry.game.appId;
  const hasSteam = stores.includes("steam") || (appId != null && appId > 0);
  const hours = playtimeHours(entry.playtimeForever);
  const unplayed = entry.playtimeForever <= 0;
  const studio = studioLine(detail ?? entry.game);
  const deck = deckLabel(detail?.deckStatus ?? entry.game.deckStatus);
  const releaseLabel = formatReleaseDate(detail?.releaseDate ?? entry.game.releaseDate);
  const isFree = detail?.isFree ?? entry.game.isFree;
  const currency = detail?.price.currency || "USD";
  const perHour = costPerHour(
    hours,
    entry.pricePaid,
    detail?.price.current ?? entry.game.currentPrice,
  );
  const players =
    detail?.minPlayers != null && detail.maxPlayers != null && detail.maxPlayers > 1
      ? `${detail.minPlayers}–${detail.maxPlayers} players`
      : null;
  const ach = detail?.achievements;
  const meta = [
    studio,
    releaseLabel,
    entry.pricePaid != null ? `bought for ${formatMoney(entry.pricePaid, currency)}` : null,
  ].filter(Boolean);

  const otherStoreActions = (entry.ownerships || []).flatMap((o) => {
    if (o.store === "steam") return [];
    const url =
      o.listing?.storeUrl ||
      entry.game.listings?.find((l) => l.store === o.store)?.storeUrl;
    if (!url) return [];
    return [
      <a key={o.store} href={url} target="_blank" rel="noreferrer" className="btn btn-secondary gap-2 text-[var(--accent)]">
        <StoreBadge store={o.store} compact />
        Open store →
      </a>,
    ];
  });

  return (
    <>
      <Link
        href="/library"
        className="q-in inline-flex min-h-9 items-center gap-2 self-start text-[13px] text-[var(--muted)] hover:text-[var(--ink)]"
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Library
      </Link>

      <section
        aria-labelledby="game-title"
        className="panel q-in relative flex min-h-[330px] flex-wrap items-end gap-6 overflow-hidden p-7"
        style={{ ["--i" as string]: 1 }}
      >
        <div aria-hidden="true" className="q-drift absolute inset-[-10%] opacity-40 blur-2xl">
          <CoverArt src={entry.game.headerImage || detail?.headerImage} seed={entry.game.id} />
        </div>
        <div aria-hidden="true" className="dot-matrix q-twinkle absolute inset-0 opacity-30" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgba(9,9,10,0.95),rgba(9,9,10,0.2)_60%,transparent)]" />

        <div className="relative min-w-0 flex-[1_1_420px]">
          <div className="flex flex-wrap gap-2 text-xs">
            {onStatusChange ? (
              <LibraryGameStatusSelect status={status ?? null} busy={statusBusy} onChange={onStatusChange} />
            ) : null}
            {isFree ? <span className={chip}>Free to Play</span> : null}
            {deck ? <span className={chip}>{deck}</span> : null}
            {players ? <span className={chip}>{players}</span> : null}
            {entry.isFamilyShared ? <span className={chip}>Family shared</span> : null}
          </div>
          <h1
            id="game-title"
            className="font-display mt-4 text-[clamp(44px,5.4vw,76px)] font-extralight leading-[0.95] tracking-[-0.045em]"
          >
            {name}
          </h1>
          <p className="font-serif mt-2.5 text-[22px] italic text-[#d6d2c8]">
            {hoursCaption({
              lastPlayedAt: entry.lastPlayedAt,
              playtime2Weeks: entry.playtime2Weeks,
              stores,
              unplayed,
            })}
          </p>
          {meta.length ? (
            <p className="mt-2.5 font-mono text-[11px] text-[var(--faint)]">{meta.join(" · ")}</p>
          ) : null}
          {hasSteam && appId != null && appId > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={`steam://run/${appId}`} className="btn btn-primary" aria-label={`Play ${name}`}>
                Play
              </a>
              <a href={`https://store.steampowered.com/app/${appId}`} target="_blank" rel="noreferrer" className="btn btn-secondary">
                Open on Steam →
              </a>
              {otherStoreActions}
            </div>
          ) : otherStoreActions.length ? (
            <div className="mt-5 flex flex-wrap gap-2">{otherStoreActions}</div>
          ) : null}
        </div>

        <dl className="relative flex flex-wrap gap-7">
          <div>
            <dt className="text-xs text-[var(--muted)]">Played</dt>
            <dd className="mt-0.5 text-5xl font-extralight leading-none tracking-[-0.04em]">
              {formatHours(hours)}
            </dd>
          </div>
          {perHour.value != null ? (
            <div>
              <dt className="text-xs text-[var(--muted)]">
                Per hour{perHour.source === "store" ? " · est." : ""}
              </dt>
              <dd className="mt-0.5 text-5xl font-extralight leading-none tracking-[-0.04em]">
                {formatMoney(perHour.value, currency)}
              </dd>
            </div>
          ) : null}
          {ach?.pct != null ? (
            <div className="flex items-center gap-3">
              <ProgressRing value={ach.pct / 100} size={60} stroke={2} label={`${ach.pct}% achievements`} />
              <div>
                <dt className="text-xs text-[var(--muted)]">Achievements</dt>
                <dd className="mt-0.5 text-[22px] font-light">
                  {ach.unlocked ?? 0}
                  <span className="text-[13px] text-[var(--faint)]"> / {ach.total ?? "—"}</span>
                </dd>
              </div>
            </div>
          ) : null}
        </dl>
      </section>
    </>
  );
};
