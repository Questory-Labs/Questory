import type {
  DashboardStats,
  MusicInsights,
  MusicPlayingNow,
  MusicRecentListen,
  ReadRecentEvent,
  WatchRecentEvent,
} from "@questorylabs/shared";
import { formatRelativePlayed } from "@/lib/dates";
import { NOW_CARD_COLOR } from "./steam.dashboard.constants";

export type NowIllustration = "pad" | "vinyl" | "tv" | "book";

export type NowCardModel = {
  key: string;
  kind: string;
  color: string;
  title: string;
  sub: string;
  href: string;
  illustration: NowIllustration;
  badgeKey?: string;
  badge?: string;
  status: string;
  live: boolean;
  sources: string[];
};

const titleCase = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

export const gameNowCard = (
  game: DashboardStats["recentlyPlayed"][number],
): NowCardModel => ({
  key: `game-${game.appId}`,
  kind: "Continue",
  color: NOW_CARD_COLOR.games,
  title: game.name,
  sub: `Last played ${formatRelativePlayed(game.lastPlayedAt)}`,
  href: `/library/${game.appId}`,
  illustration: "pad",
  badgeKey: "▶",
  badge: `${Math.round(game.playtimeForever / 60)}h`,
  status: "Recent",
  live: false,
  sources: ["Steam"],
});

export const musicNowCard = (input: {
  playingNow?: MusicPlayingNow;
  recent?: MusicRecentListen;
  insights?: MusicInsights;
}): NowCardModel | null => {
  const { playingNow, recent, insights } = input;
  const listens =
    insights != null ? `${insights.periodListens.toLocaleString()} scrobbles this week` : null;
  if (playingNow) {
    const { track } = playingNow;
    return {
      key: `music-now-${track.id}`,
      kind: "Listening",
      color: NOW_CARD_COLOR.music,
      title: `${track.title} — ${track.artistName}`,
      sub: [track.year ? String(track.year) : null, listens].filter(Boolean).join(" · ") ||
        (track.releaseTitle ?? ""),
      href: `/music/tracks/${track.id}`,
      illustration: "vinyl",
      status: "Playing",
      live: true,
      sources: playingNow.source ? [titleCase(playingNow.source)] : [],
    };
  }
  if (!recent) return null;
  return {
    key: `music-${recent.id}`,
    kind: "Listening",
    color: NOW_CARD_COLOR.music,
    title: `${recent.track.title} — ${recent.track.artistName}`,
    sub: listens ?? `Scrobbled ${formatRelativePlayed(recent.listenedAt)}`,
    href: `/music/tracks/${recent.track.id}`,
    illustration: "vinyl",
    status: "Last played",
    live: false,
    sources: [recent.musicService, recent.submissionClient]
      .filter((s): s is string => Boolean(s))
      .slice(0, 2),
  };
};

export const watchNowCard = (event: WatchRecentEvent | undefined): NowCardModel | null => {
  if (!event) return null;
  const ep = event.episode;
  const when = formatRelativePlayed(event.watchedAt);
  const partial = event.progress != null && event.progress < 100;
  return {
    key: `watch-${event.id}`,
    kind: "Watching",
    color: NOW_CARD_COLOR.watch,
    title: event.title.name,
    sub: ep ? `S${ep.seasonNumber} · E${ep.episodeNumber} · ${when}` : when,
    href: `/watch/titles/${event.title.id}`,
    illustration: "tv",
    status: partial ? "Paused" : "Watched",
    live: false,
    sources: [titleCase(event.source)],
  };
};

export const readNowCard = (event: ReadRecentEvent | undefined): NowCardModel | null => {
  if (!event) return null;
  return {
    key: `read-${event.id}`,
    kind: "Reading",
    color: NOW_CARD_COLOR.read,
    title: event.title.name,
    sub: formatRelativePlayed(event.readAt),
    href: `/read/titles/${event.title.id}`,
    illustration: "book",
    status: event.status ? titleCase(event.status.replace(/_/g, " ")) : "Reading",
    live: false,
    sources: [titleCase(event.source)],
  };
};
