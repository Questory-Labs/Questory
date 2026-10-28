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
  badgeKey: string;
  badge: string;
  status: string;
  live: boolean;
  sources: string[];
  progress: { from: string; to: string; pct: number } | null;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const clock = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
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
  progress: null,
});

export const musicNowCard = (input: {
  playingNow?: MusicPlayingNow;
  recent?: MusicRecentListen;
  insights?: MusicInsights;
  now: Date;
}): NowCardModel | null => {
  const { playingNow, recent, insights, now } = input;
  const listens =
    insights != null ? `${insights.periodListens.toLocaleString()} scrobbles this week` : null;
  if (playingNow) {
    const { track } = playingNow;
    const started = playingNow.startedAt ? Date.parse(playingNow.startedAt) : NaN;
    const elapsed = Number.isFinite(started) ? now.getTime() - started : null;
    const duration = track.durationMs ?? null;
    return {
      key: `music-now-${track.id}`,
      kind: "Listening",
      color: NOW_CARD_COLOR.music,
      title: `${track.title} — ${track.artistName}`,
      sub: [track.year ? String(track.year) : null, listens].filter(Boolean).join(" · ") ||
        (track.releaseTitle ?? ""),
      href: `/music/tracks/${track.id}`,
      illustration: "vinyl",
      badgeKey: "♪",
      badge: elapsed != null ? clock(duration ? Math.min(elapsed, duration) : elapsed) : "Live",
      status: "Playing",
      live: true,
      sources: playingNow.source ? [titleCase(playingNow.source)] : [],
      progress:
        duration && elapsed != null
          ? { from: "0:00", to: clock(duration), pct: clamp01(elapsed / duration) }
          : null,
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
    badgeKey: "♪",
    badge: formatRelativePlayed(recent.listenedAt),
    status: "Last played",
    live: false,
    sources: [recent.musicService, recent.submissionClient]
      .filter((s): s is string => Boolean(s))
      .slice(0, 2),
    progress: null,
  };
};

export const watchNowCard = (event: WatchRecentEvent | undefined): NowCardModel | null => {
  if (!event) return null;
  const ep = event.episode;
  const when = formatRelativePlayed(event.watchedAt);
  const progress = event.progress;
  const partial = progress != null && progress < 100;
  return {
    key: `watch-${event.id}`,
    kind: "Watching",
    color: NOW_CARD_COLOR.watch,
    title: event.title.name,
    sub: ep ? `S${ep.seasonNumber} · E${ep.episodeNumber} · ${when}` : when,
    href: `/watch/titles/${event.title.id}`,
    illustration: "tv",
    badgeKey: ep ? "E" : "▶",
    badge: progress != null ? `${Math.round(progress)}%` : titleCase(event.title.type),
    status: partial ? "Paused" : "Watched",
    live: false,
    sources: [titleCase(event.source)],
    progress:
      progress != null ? { from: "0%", to: "100%", pct: clamp01(progress / 100) } : null,
  };
};

export const readNowCard = (event: ReadRecentEvent | undefined): NowCardModel | null => {
  if (!event) return null;
  const when = formatRelativePlayed(event.readAt);
  const chapter = event.progress > 0 ? event.progress : null;
  const total = event.titleChapters ?? null;
  return {
    key: `read-${event.id}`,
    kind: "Reading",
    color: NOW_CARD_COLOR.read,
    title: event.title.name,
    sub: chapter ? `Chapter ${chapter} · ${when}` : when,
    href: `/read/titles/${event.title.id}`,
    illustration: "book",
    badgeKey: "C",
    badge: chapter ? (total ? `${chapter} / ${total}` : `Ch ${chapter}`) : titleCase(event.title.format),
    status: event.status ? titleCase(event.status.replace(/_/g, " ")) : "Reading",
    live: false,
    sources: [titleCase(event.source)],
    progress:
      chapter && total ? { from: "Ch 1", to: `Ch ${total}`, pct: clamp01(chapter / total) } : null,
  };
};
