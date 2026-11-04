import type { TrendingGame } from "@questorylabs/shared";
import { TrendingBadge } from "./components/TrendingTile";
import { DECK_BADGE_LABEL } from "./steam.trending.constants";

export const formatPeak = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M peak`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k peak`;
  return `${n} peak`;
};

export const formatPlayers = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
};

export const formatHours = (minutes: number) => {
  const h = minutes / 60;
  if (h >= 100) return `${Math.round(h)}h`;
  if (h >= 10) return `${h.toFixed(0)}h`;
  return `${h.toFixed(1)}h`;
};

export const friendAvatars = (game: TrendingGame) => {
  const samples = game.sampleFriends || [];
  if (!samples.length) return null;
  return (
    <span className="flex items-center gap-1">
      <span className="flex -space-x-2">
        {samples.map((f) =>
          f.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={f.steamId}
              src={f.avatarUrl}
              alt=""
              title={f.personaName}
              className="h-5 w-5 rounded-full border border-bg-0"
            />
          ) : (
            <span
              key={f.steamId}
              title={f.personaName}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-bg-0 bg-bg-3 text-[8px] text-white"
            >
              {f.personaName.slice(0, 1)}
            </span>
          ),
        )}
      </span>
    </span>
  );
};

export const rankChangeLabel = (game: TrendingGame) => {
  const change = game.rankChange;
  if (change == null || change === 0) return null;
  return change > 0 ? `↑${change}` : `↓${Math.abs(change)}`;
};

export const deckBadgeLabel = (game: TrendingGame) =>
  game.deckStatus ? DECK_BADGE_LABEL[game.deckStatus] ?? null : null;

export const gameBadges = (game: TrendingGame) => {
  const deck = deckBadgeLabel(game);
  if (!game.owned && !deck) return null;
  return (
    <>
      {game.owned ? <TrendingBadge tone="owned">Owned</TrendingBadge> : null}
      {deck ? <TrendingBadge>{deck}</TrendingBadge> : null}
    </>
  );
};

export const withRankChange = (game: TrendingGame, meta?: string) => {
  const change = rankChangeLabel(game);
  if (!change) return meta;
  return meta ? `${meta} · ${change}` : change;
};
