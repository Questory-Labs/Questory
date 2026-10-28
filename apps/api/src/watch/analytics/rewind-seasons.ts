import { PrismaService } from "../../prisma/prisma.service";

const EPISODE_LOOKUP_CAP = 2000;
const HISTORY_EVENT_CAP = 20_000;
const DROPPED_LIST_TYPE = "dropped";
const DROPPED_LOOKUP_CAP = 5000;

type Bounds = { start: Date; end: Date };

type CompletionTarget = { key: string; total: number };

export function countCompletedUnits(
  targets: Map<string, number>,
  history: { key: string; episodeId: string; watchedAt: Date }[],
  bounds: Bounds,
): number {
  const byEnd = new Map<string, Set<string>>();
  const beforeStart = new Map<string, Set<string>>();
  for (const h of history) {
    if (!targets.has(h.key) || h.watchedAt >= bounds.end) continue;
    const all = byEnd.get(h.key) ?? new Set<string>();
    all.add(h.episodeId);
    byEnd.set(h.key, all);
    if (h.watchedAt < bounds.start) {
      const before = beforeStart.get(h.key) ?? new Set<string>();
      before.add(h.episodeId);
      beforeStart.set(h.key, before);
    }
  }
  let completed = 0;
  for (const [key, total] of targets) {
    const done = byEnd.get(key)?.size ?? 0;
    const prior = beforeStart.get(key)?.size ?? 0;
    if (done >= total && prior < total) completed += 1;
  }
  return completed;
}

export async function watchSeasonOutcomes(
  prisma: PrismaService,
  userId: string,
  bounds: Bounds,
  episodeIds: string[],
): Promise<{ completedSeasons: number; droppedTitles: number }> {
  const ids = [...new Set(episodeIds)].slice(0, EPISODE_LOOKUP_CAP);
  const [episodes, droppedRows] = await Promise.all([
    ids.length
      ? prisma.episode.findMany({
          where: { id: { in: ids } },
          select: {
            titleId: true,
            seasonId: true,
            season: { select: { episodeCount: true } },
            title: { select: { totalEpisodes: true } },
          },
          take: EPISODE_LOOKUP_CAP,
        })
      : Promise.resolve([]),
    prisma.titleListState.findMany({
      where: {
        userId,
        listType: DROPPED_LIST_TYPE,
        OR: [
          { listedAt: { gte: bounds.start, lt: bounds.end } },
          { listedAt: null, updatedAt: { gte: bounds.start, lt: bounds.end } },
        ],
      },
      distinct: ["titleId"],
      select: { titleId: true },
      take: DROPPED_LOOKUP_CAP,
    }),
  ]);
  const droppedTitles = droppedRows.length;

  const targets = new Map<string, number>();
  const seasonIds = new Set<string>();
  const titleIds = new Set<string>();
  for (const ep of episodes) {
    const target = completionTarget(ep);
    if (!target) continue;
    targets.set(target.key, target.total);
    if (target.key.startsWith("s:")) seasonIds.add(ep.seasonId!);
    else titleIds.add(ep.titleId);
  }
  if (!targets.size) return { completedSeasons: 0, droppedTitles };

  const history = await prisma.watchEvent.findMany({
    where: {
      userId,
      watchedAt: { lt: bounds.end },
      episodeId: { not: null },
      OR: [
        { episode: { seasonId: { in: [...seasonIds] } } },
        { titleId: { in: [...titleIds] } },
      ],
    },
    select: {
      episodeId: true,
      titleId: true,
      watchedAt: true,
      episode: { select: { seasonId: true } },
    },
    take: HISTORY_EVENT_CAP,
  });

  const keyed = history.flatMap((h) => {
    if (!h.episodeId) return [];
    const seasonKey = h.episode?.seasonId ? `s:${h.episode.seasonId}` : null;
    const key =
      seasonKey && targets.has(seasonKey) ? seasonKey : `t:${h.titleId}`;
    return [{ key, episodeId: h.episodeId, watchedAt: h.watchedAt }];
  });

  return {
    completedSeasons: countCompletedUnits(targets, keyed, bounds),
    droppedTitles,
  };
}

function completionTarget(ep: {
  titleId: string;
  seasonId: string | null;
  season: { episodeCount: number | null } | null;
  title: { totalEpisodes: number | null };
}): CompletionTarget | null {
  const seasonCount = ep.season?.episodeCount;
  if (ep.seasonId && seasonCount != null && seasonCount > 0) {
    return { key: `s:${ep.seasonId}`, total: seasonCount };
  }
  const titleCount = ep.title.totalEpisodes;
  if (!ep.seasonId && titleCount != null && titleCount > 0) {
    return { key: `t:${ep.titleId}`, total: titleCount };
  }
  return null;
}
