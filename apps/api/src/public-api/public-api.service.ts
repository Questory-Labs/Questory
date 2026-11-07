import { Injectable } from "@nestjs/common";
import type { PublicApiScope } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FeatureFlagsService } from "../features/feature-flags.service";
import { PlayingNowService } from "../music/playing-now/playing-now.service";
import { AnalyticsService as MusicAnalyticsService } from "../music/analytics/analytics.service";
import { AnalyticsService as WatchAnalyticsService } from "../watch/analytics/analytics.service";
import { ReadAnalyticsService } from "../read/analytics/analytics.service";
import { QmonitorSessionsService } from "../qmonitor/qmonitor-sessions.service";

export type PublicRecentItem = {
  kind: "session" | "listen" | "watch" | "read";
  name: string;
  at: string;
  imageUrl: string | null;
};

const COST_FIELDS = ["pricePaid", "valueAmount", "costPerHour", "purchasedAt"] as const;

export function stripCostFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripCostFields(v)) as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if ((COST_FIELDS as readonly string[]).includes(k)) continue;
      out[k] = stripCostFields(v);
    }
    return out as T;
  }
  return value;
}

@Injectable()
export class PublicApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly playingNow: PlayingNowService,
    private readonly music: MusicAnalyticsService,
    private readonly watch: WatchAnalyticsService,
    private readonly read: ReadAnalyticsService,
    private readonly sessions: QmonitorSessionsService,
  ) {}

  async nowPlaying(userId: string, scopes: PublicApiScope[]) {
    const [session, entry] = await Promise.all([
      this.prisma.playSession.findFirst({
        where: {
          userId,
          OR: [
            { gameId: null },
            { game: { libraryEntries: { none: { userId, hidden: true } } } },
          ],
        },
        orderBy: { endedAt: "desc" },
        include: {
          game: { select: { id: true, name: true, headerImage: true, appId: true } },
        },
      }),
      this.prisma.libraryEntry.findFirst({
        where: { userId, hidden: false, lastPlayedAt: { not: null } },
        orderBy: { lastPlayedAt: "desc" },
        include: {
          game: { select: { id: true, name: true, headerImage: true, appId: true } },
        },
      }),
    ]);

    const game =
      session && (!entry?.lastPlayedAt || session.endedAt >= entry.lastPlayedAt)
        ? {
            name: session.game?.name ?? session.title,
            gameId: session.gameId,
            appId: session.game?.appId ?? session.appId,
            imageUrl: session.game?.headerImage ?? null,
            startedAt: session.startedAt.toISOString(),
            endedAt: session.endedAt.toISOString(),
            durationSecs: session.durationSecs,
            source: "session" as const,
          }
        : entry
          ? {
              name: entry.game.name,
              gameId: entry.game.id,
              appId: entry.game.appId,
              imageUrl: entry.game.headerImage,
              startedAt: null,
              endedAt: entry.lastPlayedAt?.toISOString() ?? null,
              durationSecs: null,
              source: "library" as const,
            }
          : null;

    const music =
      scopes.includes("music:read") && (await this.flags.isDomainEnabled("music"))
        ? await this.playingNow.getSnapshot(userId)
        : null;

    return { game, music };
  }

  async recent(userId: string, scopes: PublicApiScope[], limit: number) {
    const parts: Promise<PublicRecentItem[]>[] = [];

    if (scopes.includes("sessions:read")) {
      parts.push(
        this.sessions.list(userId, 1, limit).then((page) =>
          page.items.map((s) => ({
            kind: "session" as const,
            name: s.game?.name ?? s.title,
            at: s.endedAt,
            imageUrl: s.game?.headerImage ?? null,
          })),
        ),
      );
    }
    if (scopes.includes("music:read") && (await this.flags.isDomainEnabled("music"))) {
      parts.push(
        this.music.recent(userId, 1, limit).then((page) =>
          page.items.map((l) => ({
            kind: "listen" as const,
            name: `${l.track.artistName} – ${l.track.title}`,
            at: l.listenedAt,
            imageUrl: l.track.imageUrl ?? null,
          })),
        ),
      );
    }
    if (scopes.includes("watch:read") && (await this.flags.isDomainEnabled("watch"))) {
      parts.push(
        this.watch.recent(userId, 1, limit).then((page) =>
          page.items.map((w) => ({
            kind: "watch" as const,
            name: w.title.name,
            at: w.watchedAt,
            imageUrl: w.title.posterUrl ?? null,
          })),
        ),
      );
    }
    if (scopes.includes("read:read") && (await this.flags.isDomainEnabled("read"))) {
      parts.push(
        this.read.recent(userId, 1, limit).then((page) =>
          page.items.map((r) => ({
            kind: "read" as const,
            name: r.title.name,
            at: r.readAt,
            imageUrl: r.title.coverUrl ?? null,
          })),
        ),
      );
    }

    const items = (await Promise.all(parts)).flat();
    items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    return { items: items.slice(0, limit) };
  }
}
