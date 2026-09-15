import { DASHBOARD_ACTIVITY_LIMIT } from "@/lib/dashboard";
import { formatRelativePlayed } from "@/lib/dates";
import type {
  DashboardStats,
  MusicRecentListen,
  ReadRecentEvent,
  WatchRecentEvent,
} from "@questorylabs/shared";

export type DashboardActivityDomain = "games" | "music" | "watch" | "read";

export type DashboardActivityItem = {
  id: string;
  domain: DashboardActivityDomain;
  at: string;
  name: string;
  href: string;
  meta?: string;
};

const parseAt = (iso: string): number => {
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
};

export const gameContinueCaption = (
  lastPlayedAt: string | null,
  playtimeForever: number,
) =>
  `${formatRelativePlayed(lastPlayedAt)} · ${Math.round(playtimeForever / 60)}h`;

export const mergeDashboardActivity = (
  items: DashboardActivityItem[],
  limit = DASHBOARD_ACTIVITY_LIMIT,
): DashboardActivityItem[] =>
  [...items]
    .filter((item) => parseAt(item.at) > 0)
    .sort((a, b) => parseAt(b.at) - parseAt(a.at))
    .slice(0, limit);

export const collectActivityItems = (input: {
  recentlyPlayed: DashboardStats["recentlyPlayed"];
  continueAppId?: number;
  showMusic: boolean;
  showWatch: boolean;
  showRead: boolean;
  musicItems?: MusicRecentListen[];
  watchItems?: WatchRecentEvent[];
  readItems?: ReadRecentEvent[];
}): DashboardActivityItem[] => {
  const out: DashboardActivityItem[] = [];
  for (const g of input.recentlyPlayed) {
    if (g.appId === input.continueAppId) continue;
    out.push({
      id: `game-${g.appId}`,
      domain: "games",
      at: g.lastPlayedAt ?? "",
      name: g.name,
      href: `/library/${g.appId}`,
      meta: `${formatRelativePlayed(g.lastPlayedAt)} · ${Math.round(g.playtimeForever / 60)}h`,
    });
  }
  if (input.showMusic) {
    for (const row of input.musicItems ?? []) {
      out.push({
        id: `music-${row.id}`,
        domain: "music",
        at: row.listenedAt,
        name: `${row.track.title} · ${row.track.artistName}`,
        href: `/music/tracks/${row.track.id}`,
      });
    }
  }
  if (input.showWatch) {
    for (const row of input.watchItems ?? []) {
      out.push({
        id: `watch-${row.id}`,
        domain: "watch",
        at: row.watchedAt,
        name: row.title.name,
        href: `/watch/titles/${row.title.id}`,
      });
    }
  }
  if (input.showRead) {
    for (const row of input.readItems ?? []) {
      out.push({
        id: `read-${row.id}`,
        domain: "read",
        at: row.readAt,
        name: row.title.name,
        href: `/read/titles/${row.title.id}`,
      });
    }
  }
  return out;
};
