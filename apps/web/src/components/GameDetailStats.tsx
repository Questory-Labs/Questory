"use client";

import type { GameDetail } from "@questorylabs/shared";
import type { ReactNode } from "react";
import { GameDetailCatalog } from "./game-detail/GameDetailCatalog";
import {
  Chip,
  HistoryChart,
  OwnerRow,
  SectionTitle,
  deckLabel,
  formatPlayers,
  formatReleaseDate,
} from "./game-detail/game-detail-shared";

export { OwnerRow, SectionTitle };

/**
 * Shared rich game stats used by the family/multiplayer sidebar and the
 * library full-page game view.
 */
export function GameDetailStats({
  detail,
  showActions = true,
  showFriends = true,
  linkFriends = false,
  friendLimit = 12,
  chartSize = "sm",
  playtimeHours,
  beforeFriends,
  className,
}: {
  detail: GameDetail;
  showActions?: boolean;
  showFriends?: boolean;
  linkFriends?: boolean;
  friendLimit?: number;
  chartSize?: "sm" | "lg";
  playtimeHours?: number;
  beforeFriends?: ReactNode;
  className?: string;
}) {
  const d = detail;
  const online = d.onlinePlayers;
  const releaseLabel = formatReleaseDate(d.releaseDate);
  const deck = deckLabel(d.deckStatus);

  return (
    <div className={className ?? "space-y-8"}>
      {showActions && (
        <div className="flex flex-wrap gap-2">
          <a href={`steam://run/${d.appId}`} className="btn btn-primary flex-1">
            Play
          </a>
          <a
            href={`https://store.steampowered.com/app/${d.appId}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary flex-1"
          >
            Open on Steam →
          </a>
        </div>
      )}

      {(deck || releaseLabel || d.isFree) && (
        <div className="flex flex-wrap gap-2">
          {d.isFree ? <Chip>Free to Play</Chip> : null}
          {deck ? <Chip>{deck}</Chip> : null}
          {releaseLabel ? <Chip>{releaseLabel}</Chip> : null}
        </div>
      )}

      <section>
        <SectionTitle>Players online</SectionTitle>
        {online &&
        (online.current != null ||
          online.peakAllTime != null ||
          online.history.length > 0) ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="panel-outline px-2 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  Now
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--accent)]">
                  {formatPlayers(online.current)}
                </div>
              </div>
              <div className="panel-outline px-2 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  24h peak
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {formatPlayers(online.peak24h)}
                </div>
              </div>
              <div className="panel-outline px-2 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  All-time
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {formatPlayers(online.peakAllTime)}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <HistoryChart
                history={online.history}
                valueKey="players"
                label="Concurrent players history"
                size={chartSize}
                valueLabel="players"
                formatValue={(n) => formatPlayers(n) ?? String(n)}
              />
            </div>
            <a
              href={`https://steamcharts.com/app/${d.appId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-mono text-[11px] text-[var(--accent)] hover:underline"
            >
              SteamCharts →
            </a>
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No concurrent player data yet.
          </p>
        )}
      </section>

      {d.minPlayers != null && d.maxPlayers != null && (
        <section>
          <SectionTitle>Multiplayer</SectionTitle>
          <p className="text-sm text-[var(--muted)]">
            {d.minPlayers === d.maxPlayers
              ? `${d.maxPlayers} players`
              : `${d.minPlayers}–${d.maxPlayers} players`}
            <span className="mt-1 block font-mono text-[10px] text-[var(--faint)]">
              {d.playerCountSource === "igdb"
                ? "Source: IGDB"
                : d.playerCountSource === "steam_tag"
                  ? "Source: Steam store tag"
                  : "Trusted capacity data"}
            </span>
          </p>
          {d.playerMaxes && d.playerMaxes.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.playerMaxes.map((n) => (
                <Chip key={n}>MAX {n}</Chip>
              ))}
            </div>
          ) : null}
        </section>
      )}

      {(d.developers?.length > 0 || d.publishers?.length > 0) && (
        <section>
          <SectionTitle>Studio</SectionTitle>
          {d.developers?.length ? (
            <p className="text-sm text-[var(--muted)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Dev
              </span>{" "}
              {d.developers.join(" · ")}
            </p>
          ) : null}
          {d.publishers?.length ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Pub
              </span>{" "}
              {d.publishers.join(" · ")}
            </p>
          ) : null}
        </section>
      )}

      {beforeFriends}

      {showFriends && (
        <section>
          <SectionTitle>Friends who own it</SectionTitle>
          {d.friendOwners.length ? (
            <div className="divide-y divide-[var(--line)]">
              {d.friendOwners.slice(0, friendLimit).map((o) => (
                <OwnerRow
                  key={o.steamId}
                  personaName={o.personaName}
                  avatarUrl={o.avatarUrl}
                  playtimeHours={o.playtimeHours}
                  href={linkFriends ? `/friends/${o.steamId}` : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              No synced friends own this yet.
            </p>
          )}
        </section>
      )}

      <GameDetailCatalog
        detail={d}
        chartSize={chartSize}
        playtimeHours={playtimeHours}
      />
    </div>
  );
}
