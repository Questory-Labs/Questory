import { TrendingGame } from "@questorylabs/shared";

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
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {samples.map((f) =>
          f.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={f.steamId}
              src={f.avatarUrl}
              alt=""
              title={f.personaName}
              className="h-5 w-5 rounded-full border border-black/40"
            />
          ) : (
            <span
              key={f.steamId}
              title={f.personaName}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/40 bg-[var(--bg-2)] text-[8px] text-white"
            >
              {f.personaName.slice(0, 1)}
            </span>
          ),
        )}
      </div>
      <span className="text-[10px] text-white/90">
        {game.friendCount} friend{(game.friendCount || 0) === 1 ? "" : "s"}
      </span>
    </div>
  );
};

export const rankBadge = (game: TrendingGame) => {
  if (game.rank == null) return null;
  const change = game.rankChange;
  let changeLabel = "";
  if (change != null && change !== 0) {
    changeLabel = change > 0 ? ` ↑${change}` : ` ↓${Math.abs(change)}`;
  }
  return (
    <span className="rounded-md bg-black/65 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-white">
      #{game.rank}
      {changeLabel}
    </span>
  );
};
