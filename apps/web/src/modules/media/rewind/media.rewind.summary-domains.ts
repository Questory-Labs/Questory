import type {
  RewindAllStats,
  RewindGamesStats,
  RewindMusicStats,
  RewindReadStats,
  RewindTopGenre,
  RewindTopItem,
  RewindWatchStats,
} from "@questorylabs/shared";
import { rewindExtrasTiles, rewindFadedList } from "./components/RewindExtras";
import { dayLabel, formatCount, formatHours } from "./media.rewind.format";
import type { RewindRankList, RewindStatTile } from "./media.rewind.summary.types";

type Built = { stats: RewindStatTile[]; lists: RewindRankList[] };

const bareHours = (minutes: number): string => formatHours(minutes).replace(/h$/, "");

const rank = (
  key: string,
  title: string,
  items: (RewindTopItem | RewindTopGenre)[] | undefined,
  value: (count: number) => string,
): RewindRankList | null =>
  items?.length
    ? {
        key,
        title,
        items: items.slice(0, 5).map((item) => {
          const top = item as RewindTopItem;
          return {
            id: item.id,
            name: item.name,
            value: value(item.count),
            subtitle: top.subtitle ?? null,
            imageUrl: top.imageUrl ?? null,
          };
        }),
      }
    : null;

const compact = <T,>(rows: (T | null | undefined | false)[]): T[] =>
  rows.filter((row): row is T => Boolean(row));

const peakTile = (
  key: string,
  label: string,
  peakHour: { label: string } | null,
  note: string | undefined,
): RewindStatTile | null =>
  peakHour ? { key, label, value: peakHour.label, note } : null;

export const gamesSummary = (stats: RewindGamesStats): Built => {
  const sessionTiles: (RewindStatTile | null)[] = stats.sessionsAvailable
    ? [
        {
          key: "sessions",
          label: "Sessions",
          value: formatCount(stats.sessions),
          note: stats.longestSession
            ? `Longest ${formatHours(stats.longestSession.minutes)} · ${stats.longestSession.name}`
            : undefined,
        },
        peakTile(
          "peak",
          "Peak playing",
          stats.peakHour,
          stats.lateNightShare != null ? `${stats.lateNightShare}% late night` : stats.peakDow?.label,
        ),
      ]
    : [{ key: "sessions", label: "Sessions", value: "—", note: "Install qMonitor to unlock session stats" }];
  const stats6 = compact<RewindStatTile>([
    {
      key: "played",
      label: "Games played",
      value: formatCount(stats.uniqueGames),
      note: stats.newGames ? `${stats.newGames} new to you` : undefined,
    },
    ...sessionTiles,
    stats.achievementsInPeriod != null && {
      key: "achievements",
      label: "Achievements",
      value: formatCount(stats.achievementsInPeriod),
      note: stats.perfectGames ? `${stats.perfectGames} ${stats.perfectGames === 1 ? "game" : "games"} at 100%` : undefined,
    },
    stats.backlog != null && {
      key: "backlog",
      label: "Backlog",
      value: formatCount(stats.backlog),
      note: "Unplayed today",
    },
    stats.abandoned?.length
      ? { key: "abandoned", label: "Tried & set aside", value: formatCount(stats.abandoned.length) }
      : null,
    ...rewindExtrasTiles(stats, stats.period, "hours", bareHours),
  ]);
  return {
    stats: stats6,
    lists: compact([
      rank("top-games", "Top games", stats.topGames, formatHours),
      rank("top-genres", "Top genres", stats.topGenres, formatHours),
      rank("abandoned", "Tried & set aside", stats.abandoned, (n) => `${n} min`),
      rewindFadedList(stats, stats.period, "hours", bareHours),
    ]),
  };
};

export const musicSummary = (stats: RewindMusicStats): Built => ({
  stats: compact<RewindStatTile>([
    { key: "hours", label: "Hours listened", value: formatHours(stats.listeningMinutes) },
    {
      key: "discoveries",
      label: "New discoveries",
      value: formatCount(stats.newTracks + stats.newArtists),
      note: "Tracks & artists",
    },
    peakTile("peak", "Peak listening", stats.peakHour, stats.peakDow?.label),
    stats.maxRepeatsInDay && {
      key: "repeat",
      label: "On repeat",
      value: `${stats.maxRepeatsInDay.count}×`,
      note: `${stats.maxRepeatsInDay.name} in one day`,
    },
    ...rewindExtrasTiles(stats, stats.period, "plays"),
  ]),
  lists: compact([
    rank("top-artists", "Top artists", stats.topArtists, formatCount),
    rank("top-tracks", "Top tracks", stats.topTracks, formatCount),
    rank("top-genres", "Top genres", stats.topGenres, formatCount),
    rewindFadedList(stats, stats.period, "plays"),
  ]),
});

export const watchSummary = (stats: RewindWatchStats): Built => {
  const topBinge = stats.bingeRuns?.[0];
  const topRated = stats.topRated?.[0];
  return {
    stats: compact<RewindStatTile>([
      { key: "hours", label: "Hours watched", value: formatHours(stats.watchingMinutes) },
      {
        key: "titles",
        label: "Unique titles",
        value: formatCount(stats.uniqueTitles),
        note: `${stats.movieWatches} movies, ${stats.showWatches} shows`,
      },
      peakTile("peak", "Peak watching", stats.peakHour, stats.peakDow?.label),
      stats.bingeRuns?.length
        ? {
            key: "binge",
            label: "Binge days",
            value: formatCount(stats.bingeRuns.length),
            note: topBinge ? `Most: ${topBinge.count} episodes` : undefined,
          }
        : null,
      stats.completedSeasons != null && {
        key: "completed",
        label: "Completed",
        value: formatCount(stats.completedSeasons),
        note: stats.completedSeasons === 1 ? "season" : "seasons",
      },
      topRated && { key: "rated", label: "Top rated", value: topRated.name, note: `${topRated.count}/10` },
      stats.droppedTitles != null && {
        key: "dropped",
        label: "Dropped",
        value: formatCount(stats.droppedTitles),
      },
      ...rewindExtrasTiles(stats, stats.period, "watches"),
    ]),
    lists: compact([
      rank("top-titles", "Top titles", stats.topTitles, (n) => `${n} watches`),
      rank("top-genres", "Top genres", stats.topGenres, (n) => `${n} watches`),
      rank(
        "top-rated",
        stats.avgRating != null ? `Top rated · avg ${stats.avgRating}` : "Top rated",
        stats.topRated,
        (n) => `${n}/10`,
      ),
      rank("unfinished", "Unfinished", stats.unfinished, (n) => `${n}%`),
      rank("binge", "Binge days", stats.bingeRuns, (n) => `${n} eps`),
      rewindFadedList(stats, stats.period, "watches"),
    ]),
  };
};

export const readSummary = (stats: RewindReadStats): Built => {
  const totalFormats = stats.formatBreakdown.reduce((sum, f) => sum + f.count, 0);
  const formats: RewindRankList | null =
    totalFormats > 0
      ? {
          key: "formats",
          title: "Formats",
          items: stats.formatBreakdown.slice(0, 5).map((f) => ({
            id: f.name,
            name: f.name,
            value: `${Math.round((f.count / totalFormats) * 100)}%`,
          })),
        }
      : null;
  return {
    stats: compact<RewindStatTile>([
      { key: "events", label: "Total events", value: formatCount(stats.totalEvents) },
      { key: "titles", label: "Unique titles", value: formatCount(stats.uniqueTitles) },
      peakTile("peak", "Peak reading", stats.peakHour, stats.peakDow?.label),
      stats.statusBreakdown && { key: "completed", label: "Completed", value: formatCount(stats.statusBreakdown.completed) },
      stats.statusBreakdown && { key: "dropped", label: "Dropped", value: formatCount(stats.statusBreakdown.dropped) },
      stats.statusBreakdown && { key: "repeating", label: "Re-reading", value: formatCount(stats.statusBreakdown.repeating) },
      stats.volumesRead ? { key: "volumes", label: "Volumes", value: formatCount(stats.volumesRead) } : null,
      stats.inProgress != null && {
        key: "progress",
        label: "In progress",
        value: formatCount(stats.inProgress),
        note: stats.inProgress === 1 ? "title" : "titles",
      },
      ...rewindExtrasTiles(stats, stats.period, "sessions"),
    ]),
    lists: compact([
      rank("top-titles", "Top titles", stats.topTitles, (n) => `${n} reads`),
      formats,
      rank("top-genres", "Top genres", stats.topGenres, (n) => `${n} reads`),
      rewindFadedList(stats, stats.period, "sessions"),
    ]),
  };
};

const longestActiveStreak = (
  daily: RewindAllStats["daily"],
): { days: number; from: string; to: string } | null => {
  if (!daily?.length || daily[0]!.date.split("-").length !== 3) return null;
  const active = daily
    .filter((d) => Object.values(d.counts).some((n) => (n ?? 0) > 0))
    .map((d) => d.date)
    .sort();
  let best: { days: number; from: string; to: string } | null = null;
  let runStart = 0;
  for (let i = 0; i < active.length; i += 1) {
    const prev = i > 0 ? Date.parse(`${active[i - 1]}T00:00:00Z`) : NaN;
    const cur = Date.parse(`${active[i]}T00:00:00Z`);
    if (i === 0 || cur - prev !== 86_400_000) runStart = i;
    const days = i - runStart + 1;
    if (!best || days > best.days) best = { days, from: active[runStart]!, to: active[i]! };
  }
  return best && best.days >= 2 ? best : null;
};

export const allSummary = (stats: RewindAllStats): Built => {
  const { music, watch, read, games } = stats.domains;
  const streak = longestActiveStreak(stats.daily);
  return {
    stats: compact<RewindStatTile>([
      games && {
        key: "games",
        label: "Games",
        value: formatHours(games.totalMinutes),
        note: [`${formatCount(games.uniqueGames)} games`, games.topGames[0]?.name].filter(Boolean).join(" · "),
      },
      music && {
        key: "music",
        label: "Music",
        value: formatHours(music.listeningMinutes),
        note: [`${formatCount(music.totalPlays)} plays`, music.topArtists[0]?.name].filter(Boolean).join(" · "),
      },
      watch && {
        key: "watch",
        label: "Watch",
        value: formatHours(watch.watchingMinutes),
        note: [`${formatCount(watch.uniqueTitles)} titles`, watch.topTitles[0]?.name].filter(Boolean).join(" · "),
      },
      read && {
        key: "read",
        label: "Read",
        value: `${formatCount(read.chaptersLogged)} ch.`,
        note: [`${formatCount(read.uniqueTitles)} titles`, read.topTitles[0]?.name].filter(Boolean).join(" · "),
      },
      streak && {
        key: "streak",
        label: "Longest streak",
        value: `${streak.days} days`,
        note: `${dayLabel(streak.from)} – ${dayLabel(streak.to)}`,
      },
    ]),
    lists: compact([
      games && rank("top-games", "Top games", games.topGames, formatHours),
      music && rank("top-artists", "Top artists", music.topArtists, formatCount),
      watch && rank("top-titles-watch", "Top watched", watch.topTitles, (n) => `${n} watches`),
      read && rank("top-titles-read", "Top reads", read.topTitles, (n) => `${n} reads`),
    ]),
  };
};
