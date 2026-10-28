import type { PrismaService } from "../../prisma/prisma.service";
import {
  CONTINUE_WATCHING_SCAN_LIMIT,
  CONTINUE_WATCHING_WINDOW_DAYS,
  TITLE_EPISODE_LIST_LIMIT,
  TITLE_WATCH_TOTALS_LIMIT,
} from "./analytics.constants";

export type TopsSort = "count" | "minutes";

type RuntimeSource = {
  runtimeMinutes?: number | null;
  episode?: { runtimeMinutes?: number | null } | null;
  title?: { runtimeMinutes?: number | null } | null;
};

export function eventMinutes(e: RuntimeSource): number {
  const runtime =
    e.runtimeMinutes ??
    e.episode?.runtimeMinutes ??
    e.title?.runtimeMinutes ??
    null;
  return runtime != null && runtime > 0 ? runtime : 0;
}

export function sortTopTitles<T extends { count: number; minutes: number }>(
  items: T[],
  sort: TopsSort = "count",
): T[] {
  return items.sort((a, b) =>
    sort === "minutes"
      ? b.minutes - a.minutes || b.count - a.count
      : b.count - a.count,
  );
}

type EpisodeRef = { seasonNumber: number; episodeNumber: number };

function episodeKey(ep: EpisodeRef) {
  return `${ep.seasonNumber}:${ep.episodeNumber}`;
}

function compareEpisodes(a: EpisodeRef, b: EpisodeRef) {
  return a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber;
}

export function nextEpisodeAfter<T extends EpisodeRef>(
  last: EpisodeRef,
  list: T[],
  watchedCount: number,
  totalEpisodes: number | null,
): (EpisodeRef & { name: string | null }) | null {
  if (list.length > 0) {
    const next = [...list]
      .filter((ep) => ep.seasonNumber > 0)
      .sort(compareEpisodes)
      .find((ep) => compareEpisodes(ep, last) > 0);
    if (!next) return null;
    return {
      seasonNumber: next.seasonNumber,
      episodeNumber: next.episodeNumber,
      name: (next as { name?: string | null }).name ?? null,
    };
  }
  if (totalEpisodes != null && watchedCount >= totalEpisodes) return null;
  return {
    seasonNumber: last.seasonNumber,
    episodeNumber: last.episodeNumber + 1,
    name: null,
  };
}

export function progressPercent(
  watched: number,
  total: number | null | undefined,
): number | null {
  if (total == null || total <= 0) return null;
  return Math.min(100, Math.round((watched / total) * 100));
}

export async function titleWatchExtras(
  prisma: PrismaService,
  userId: string,
  title: { id: string; type: string; runtimeMinutes: number | null },
) {
  const events = await prisma.watchEvent.findMany({
    where: { userId, titleId: title.id },
    orderBy: { watchedAt: "desc" },
    take: TITLE_WATCH_TOTALS_LIMIT,
    select: {
      watchedAt: true,
      runtimeMinutes: true,
      episode: {
        select: {
          seasonNumber: true,
          episodeNumber: true,
          runtimeMinutes: true,
          name: true,
          airDate: true,
        },
      },
    },
  });

  let totalMinutesWatched = 0;
  const watched = new Map<
    string,
    {
      seasonNumber: number;
      episodeNumber: number;
      name: string | null;
      airDate: Date | null;
      runtimeMinutes: number | null;
      count: number;
      last: Date;
    }
  >();
  for (const e of events ?? []) {
    totalMinutesWatched += eventMinutes({ ...e, title });
    if (!e.episode) continue;
    const key = episodeKey(e.episode);
    const cur = watched.get(key);
    if (cur) {
      cur.count += 1;
      if (e.watchedAt > cur.last) cur.last = e.watchedAt;
    } else {
      watched.set(key, {
        seasonNumber: e.episode.seasonNumber,
        episodeNumber: e.episode.episodeNumber,
        name: e.episode.name ?? null,
        airDate: e.episode.airDate ?? null,
        runtimeMinutes: e.episode.runtimeMinutes ?? null,
        count: 1,
        last: e.watchedAt,
      });
    }
  }

  if (title.type !== "show") {
    return {
      totalMinutesWatched,
      distinctEpisodesWatched: watched.size,
      seasons: [],
    };
  }

  const [seasonRows, episodeRows] = await Promise.all([
    prisma.season.findMany({
      where: { titleId: title.id },
      orderBy: { seasonNumber: "asc" },
      take: 200,
      select: { seasonNumber: true, name: true, episodeCount: true },
    }),
    prisma.episode.findMany({
      where: { titleId: title.id },
      orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
      take: TITLE_EPISODE_LIST_LIMIT,
      select: {
        seasonNumber: true,
        episodeNumber: true,
        name: true,
        airDate: true,
        runtimeMinutes: true,
      },
    }),
  ]);

  const seasons = new Map<
    number,
    {
      seasonNumber: number;
      name: string | null;
      episodeCount: number | null;
      episodes: Map<
        number,
        {
          seasonNumber: number;
          episodeNumber: number;
          name: string | null;
          airDate: string | null;
          runtimeMinutes: number | null;
          watchCount: number;
          lastWatchedAt: string | null;
        }
      >;
    }
  >();
  const seasonFor = (n: number) => {
    let s = seasons.get(n);
    if (!s) {
      s = { seasonNumber: n, name: null, episodeCount: null, episodes: new Map() };
      seasons.set(n, s);
    }
    return s;
  };
  for (const row of seasonRows ?? []) {
    const s = seasonFor(row.seasonNumber);
    s.name = row.name ?? null;
    s.episodeCount = row.episodeCount ?? null;
  }
  for (const ep of episodeRows ?? []) {
    const w = watched.get(episodeKey(ep));
    seasonFor(ep.seasonNumber).episodes.set(ep.episodeNumber, {
      seasonNumber: ep.seasonNumber,
      episodeNumber: ep.episodeNumber,
      name: ep.name ?? null,
      airDate: ep.airDate?.toISOString() ?? null,
      runtimeMinutes: ep.runtimeMinutes ?? null,
      watchCount: w?.count ?? 0,
      lastWatchedAt: w?.last.toISOString() ?? null,
    });
  }
  for (const w of watched.values()) {
    const s = seasonFor(w.seasonNumber);
    if (s.episodes.has(w.episodeNumber)) continue;
    s.episodes.set(w.episodeNumber, {
      seasonNumber: w.seasonNumber,
      episodeNumber: w.episodeNumber,
      name: w.name,
      airDate: w.airDate?.toISOString() ?? null,
      runtimeMinutes: w.runtimeMinutes,
      watchCount: w.count,
      lastWatchedAt: w.last.toISOString(),
    });
  }

  return {
    totalMinutesWatched,
    distinctEpisodesWatched: watched.size,
    seasons: [...seasons.values()]
      .sort((a, b) => a.seasonNumber - b.seasonNumber)
      .map((s) => {
        const episodes = [...s.episodes.values()].sort(
          (a, b) => a.episodeNumber - b.episodeNumber,
        );
        return {
          seasonNumber: s.seasonNumber,
          name: s.name,
          episodeCount: s.episodeCount,
          watchedEpisodes: episodes.filter((e) => e.watchCount > 0).length,
          episodes,
        };
      }),
  };
}

async function nextAiredEpisode(
  prisma: PrismaService,
  titleId: string,
  last: EpisodeRef,
  now: Date,
): Promise<{
  hasEpisodes: boolean;
  next: (EpisodeRef & { name: string | null }) | null;
}> {
  const next = await prisma.episode.findFirst({
    where: {
      titleId,
      seasonNumber: { gt: 0 },
      OR: [
        {
          seasonNumber: last.seasonNumber,
          episodeNumber: { gt: last.episodeNumber },
        },
        { seasonNumber: { gt: last.seasonNumber } },
      ],
      AND: [{ OR: [{ airDate: null }, { airDate: { lte: now } }] }],
    },
    orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
    select: { seasonNumber: true, episodeNumber: true, name: true },
  });
  if (next) return { hasEpisodes: true, next };
  const any = await prisma.episode.findFirst({
    where: { titleId },
    select: { id: true },
  });
  return { hasEpisodes: any != null, next: null };
}

export async function continueWatching(
  prisma: PrismaService,
  userId: string,
  limit: number,
  now = Date.now(),
) {
  const since = new Date(now - CONTINUE_WATCHING_WINDOW_DAYS * 86_400_000);
  const events = await prisma.watchEvent.findMany({
    where: {
      userId,
      watchedAt: { gte: since },
      episodeId: { not: null },
      title: { type: "show" },
    },
    orderBy: { watchedAt: "desc" },
    take: CONTINUE_WATCHING_SCAN_LIMIT,
    select: {
      titleId: true,
      watchedAt: true,
      episode: { select: { seasonNumber: true, episodeNumber: true } },
    },
  });

  const latest = new Map<string, { lastWatchedAt: Date; last: EpisodeRef }>();
  for (const e of events) {
    if (!e.episode) continue;
    const cur = latest.get(e.titleId);
    if (!cur) {
      latest.set(e.titleId, { lastWatchedAt: e.watchedAt, last: e.episode });
    } else if (compareEpisodes(e.episode, cur.last) > 0) {
      cur.last = e.episode;
    }
  }
  const candidateIds = [...latest.keys()].slice(0, limit * 3);
  if (candidateIds.length === 0) return { items: [] };

  const [titles, episodeRows, watchedRows] = await Promise.all([
    prisma.title.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        name: true,
        displayName: true,
        posterUrl: true,
        backdropUrl: true,
        totalEpisodes: true,
        anilistId: true,
        malId: true,
      },
    }),
    Promise.all(
      candidateIds.map((id) =>
        nextAiredEpisode(prisma, id, latest.get(id)!.last, new Date(now)),
      ),
    ),
    prisma.watchEvent.findMany({
      where: {
        userId,
        titleId: { in: candidateIds },
        episodeId: { not: null },
      },
      distinct: ["titleId", "episodeId"],
      take: TITLE_WATCH_TOTALS_LIMIT,
      select: { titleId: true },
    }),
  ]);

  const titleById = new Map(titles.map((t) => [t.id, t]));
  const episodeInfoByTitle = new Map(
    candidateIds.map((id, i) => [id, episodeRows[i]!]),
  );
  const watchedByTitle = new Map<string, number>();
  for (const row of watchedRows) {
    watchedByTitle.set(row.titleId, (watchedByTitle.get(row.titleId) ?? 0) + 1);
  }

  const items = [];
  for (const id of candidateIds) {
    if (items.length >= limit) break;
    const title = titleById.get(id);
    const state = latest.get(id);
    if (!title || !state) continue;
    const watchedEpisodes = watchedByTitle.get(id) ?? 0;
    const info = episodeInfoByTitle.get(id);
    const next = info?.hasEpisodes
      ? info.next
      : nextEpisodeAfter(state.last, [], watchedEpisodes, title.totalEpisodes);
    if (!next) continue;
    items.push({
      title: {
        id: title.id,
        name: title.displayName?.trim() || title.name,
        posterUrl: title.posterUrl,
        backdropUrl: title.backdropUrl,
        totalEpisodes: title.totalEpisodes,
      },
      anime: title.anilistId != null || title.malId != null,
      lastWatchedAt: state.lastWatchedAt.toISOString(),
      last: {
        seasonNumber: state.last.seasonNumber,
        episodeNumber: state.last.episodeNumber,
      },
      next,
      watchedEpisodes,
      progress: progressPercent(watchedEpisodes, title.totalEpisodes),
    });
  }
  return { items };
}
