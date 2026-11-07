import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { bangumiCollectionTypeName } from "../../read/bangumi/bangumi-map";
import { CatalogService } from "../../watch/catalog/catalog.service";

const PAGE_SIZE = 500;
const PLEX_MUSIC_TYPES = new Set(["track", "album", "artist"]);
const JELLYFIN_MUSIC_TYPES = new Set(["audio", "musicalbum", "musicartist"]);

export type WebhookPayloadInfo = {
  mediaType: string;
  notification: string;
  completed: boolean | null;
};

function firstMatch(text: string, pattern: RegExp): string {
  return pattern.exec(text)?.[1] ?? "";
}

function parsePayload(raw: string): Record<string, any> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, any>)
      : null;
  } catch {
    return null;
  }
}

export function readWebhookPayload(
  source: string,
  raw: string | null,
): WebhookPayloadInfo {
  const text = raw ?? "";
  const body = parsePayload(text);
  if (source === "plex") {
    const mediaType = body
      ? String(body.Metadata?.type ?? "")
      : firstMatch(text, /"Metadata":\{.*?"type":"([^"]+)"/s);
    return {
      mediaType: mediaType.toLowerCase(),
      notification: "",
      completed: null,
    };
  }

  const item = body?.Item ?? body;
  const mediaType = body
    ? String(item?.Type ?? item?.ItemType ?? body.ItemType ?? "")
    : firstMatch(text, /"ItemType":"([^"]+)"/);
  const notification = body
    ? String(body.NotificationType ?? body.notification_type ?? body.Event ?? "")
    : firstMatch(text, /"(?:NotificationType|notification_type|Event)":"([^"]+)"/);
  const completedText = body
    ? String(body.PlayedToCompletion ?? "")
    : firstMatch(text, /"PlayedToCompletion":"?(true|false)/i);
  return {
    mediaType: mediaType.toLowerCase(),
    notification: notification.toLowerCase(),
    completed: completedText ? completedText.toLowerCase() === "true" : null,
  };
}

export function isWebhookMusic(source: string, info: WebhookPayloadInfo) {
  return (source === "plex" ? PLEX_MUSIC_TYPES : JELLYFIN_MUSIC_TYPES).has(
    info.mediaType,
  );
}

function isConfirmedJellyfinWatch(info: WebhookPayloadInfo) {
  return (
    info.notification.includes("scrobble") ||
    (info.notification.includes("playbackstop") && info.completed === true)
  );
}

export function currentBangumiKey(
  legacyKey: string,
  bangumiId: number | null | undefined,
): { key: string; status: string } | null {
  const match = /^bangumi:(list|manga):undefined:(\d+):(\d+)$/.exec(legacyKey);
  if (!match || bangumiId == null) return null;
  const status = bangumiCollectionTypeName(Number(match[2]));
  if (!status) return null;
  return {
    key: `bangumi:${match[1]}:${bangumiId}:${status}:${match[3]}`,
    status,
  };
}

type RekeyCounts = {
  scanned: number;
  rekeyed: number;
  duplicatesDeleted: number;
  unresolved: number;
};

@Injectable()
export class SourceDataRepairService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  async repairBangumiKeys(apply: boolean) {
    const affected = new Set<string>();
    const watch = await this.rekeyBangumiWatches(apply, affected);
    const read = await this.rekeyBangumiReads(apply);
    if (apply) await this.rebuildBuckets(affected);
    return { applied: apply, watch, read };
  }

  private async rekeyBangumiWatches(apply: boolean, affected: Set<string>) {
    const counts: RekeyCounts = {
      scanned: 0,
      rekeyed: 0,
      duplicatesDeleted: 0,
      unresolved: 0,
    };
    let lastId = "";
    for (;;) {
      const rows = await this.prisma.watchEvent.findMany({
        where: {
          dedupeKey: { startsWith: "bangumi:list:undefined:" },
          id: { gt: lastId },
        },
        select: {
          id: true,
          userId: true,
          dedupeKey: true,
          title: { select: { bangumiId: true } },
        },
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
      });
      for (const row of rows) {
        counts.scanned += 1;
        const next = currentBangumiKey(row.dedupeKey, row.title.bangumiId);
        if (!next) {
          counts.unresolved += 1;
          continue;
        }
        const taken = await this.prisma.watchEvent.findUnique({
          where: {
            userId_dedupeKey: { userId: row.userId, dedupeKey: next.key },
          },
          select: { id: true },
        });
        if (taken) {
          counts.duplicatesDeleted += 1;
          affected.add(row.userId);
          if (apply) {
            await this.prisma.watchEvent.deleteMany({ where: { id: row.id } });
          }
        } else {
          counts.rekeyed += 1;
          if (apply) {
            await this.prisma.watchEvent.update({
              where: { id: row.id },
              data: { dedupeKey: next.key },
            });
          }
        }
      }
      if (rows.length < PAGE_SIZE) return counts;
      lastId = rows[rows.length - 1].id;
    }
  }

  private async rekeyBangumiReads(apply: boolean) {
    const counts: RekeyCounts = {
      scanned: 0,
      rekeyed: 0,
      duplicatesDeleted: 0,
      unresolved: 0,
    };
    let lastId = "";
    for (;;) {
      const rows = await this.prisma.readEvent.findMany({
        where: {
          dedupeKey: { startsWith: "bangumi:manga:undefined:" },
          id: { gt: lastId },
        },
        select: {
          id: true,
          userId: true,
          dedupeKey: true,
          readTitle: { select: { bangumiId: true } },
        },
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
      });
      for (const row of rows) {
        counts.scanned += 1;
        const next = currentBangumiKey(row.dedupeKey, row.readTitle.bangumiId);
        if (!next) {
          counts.unresolved += 1;
          continue;
        }
        const taken = await this.prisma.readEvent.findUnique({
          where: {
            userId_dedupeKey: { userId: row.userId, dedupeKey: next.key },
          },
          select: { id: true },
        });
        if (taken) {
          counts.duplicatesDeleted += 1;
          if (apply) {
            await this.prisma.readEvent.deleteMany({ where: { id: row.id } });
          }
        } else {
          counts.rekeyed += 1;
          if (apply) {
            await this.prisma.readEvent.update({
              where: { id: row.id },
              data: { dedupeKey: next.key, status: next.status },
            });
          }
        }
      }
      if (rows.length < PAGE_SIZE) return counts;
      lastId = rows[rows.length - 1].id;
    }
  }

  async repairWebhookMusic(apply: boolean) {
    const affected = new Set<string>();
    const counts = {
      scanned: 0,
      musicDeleted: 0,
      jellyfinConfirmedWatches: 0,
      jellyfinUnconfirmedKept: 0,
    };
    let lastId = "";
    for (;;) {
      const rows = await this.prisma.watchEvent.findMany({
        where: { source: { in: ["plex", "jellyfin"] }, id: { gt: lastId } },
        select: { id: true, userId: true, source: true, rawPayload: true },
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
      });
      for (const row of rows) {
        counts.scanned += 1;
        const info = readWebhookPayload(row.source, row.rawPayload);
        if (isWebhookMusic(row.source, info)) {
          counts.musicDeleted += 1;
          affected.add(row.userId);
          if (apply) {
            await this.prisma.watchEvent.deleteMany({ where: { id: row.id } });
          }
        } else if (row.source === "jellyfin") {
          if (isConfirmedJellyfinWatch(info)) {
            counts.jellyfinConfirmedWatches += 1;
          } else {
            counts.jellyfinUnconfirmedKept += 1;
          }
        }
      }
      if (rows.length < PAGE_SIZE) break;
      lastId = rows[rows.length - 1].id;
    }
    if (apply) await this.rebuildBuckets(affected);
    return { applied: apply, ...counts };
  }

  async rebuildWatchBuckets(apply: boolean) {
    const [events, buckets] = await Promise.all([
      this.prisma.watchEvent.groupBy({ by: ["userId"], _count: { _all: true } }),
      this.prisma.watchHourBucket.groupBy({
        by: ["userId"],
        _sum: { watchCount: true },
      }),
    ]);
    const eventsByUser = new Map(events.map((e) => [e.userId, e._count._all]));
    const bucketsByUser = new Map(
      buckets.map((b) => [b.userId, b._sum.watchCount ?? 0]),
    );
    const users = new Set([...eventsByUser.keys(), ...bucketsByUser.keys()]);
    const mismatchedUsers = [...users].filter(
      (id) => (eventsByUser.get(id) ?? 0) !== (bucketsByUser.get(id) ?? 0),
    ).length;
    if (apply) await this.rebuildBuckets(users);
    return {
      applied: apply,
      users: users.size,
      mismatchedUsers,
      eventCount: events.reduce((sum, e) => sum + e._count._all, 0),
      bucketWatchCount: buckets.reduce(
        (sum, b) => sum + (b._sum.watchCount ?? 0),
        0,
      ),
    };
  }

  private async rebuildBuckets(userIds: Set<string>) {
    for (const userId of userIds) {
      await this.catalog.rebuildWatchHourBuckets(userId);
    }
  }
}
