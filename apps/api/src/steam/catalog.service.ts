import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { SteamApiService } from "./steam-api.service";

const LOCK_KEY = "steam:catalog:sync:lock";
const LOCK_TTL = 600;

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly steam: SteamApiService,
    private readonly cache: CacheService,
  ) {}

  async getStatus() {
    const state = await this.prisma.steamCatalogSyncState.findUnique({
      where: { id: "default" },
    });
    const total = await this.prisma.steamCatalogApp.count();
    return {
      lastAppId: state?.lastAppId ?? 0,
      ifModifiedSince: state?.ifModifiedSince ?? null,
      lastSyncedAt: state?.lastSyncedAt?.toISOString() ?? null,
      lastPageCount: state?.lastPageCount ?? 0,
      totalApps: total || state?.totalApps || 0,
      status: state?.status ?? "idle",
      error: state?.error ?? null,
    };
  }

  /**
   * Pull one or more GetAppList pages. Uses last_appid continuation and
   * if_modified_since for incremental refreshes after a full pass.
   */
  async syncIncremental(options?: {
    maxPages?: number;
    maxResults?: number;
    forceFull?: boolean;
  }) {
    const acquired = await this.cache.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!acquired) {
      return { ok: false, reason: "already_running" as const };
    }

    const maxPages = Math.min(20, Math.max(1, options?.maxPages || 3));
    const maxResults = Math.min(
      50000,
      Math.max(100, options?.maxResults || 5000),
    );

    try {
      let state = await this.prisma.steamCatalogSyncState.upsert({
        where: { id: "default" },
        create: { id: "default", status: "running" },
        update: { status: "running", error: null },
      });

      let lastAppId = options?.forceFull ? 0 : state.lastAppId || 0;
      const ifModifiedSince =
        !options?.forceFull && lastAppId === 0 && state.ifModifiedSince
          ? state.ifModifiedSince
          : undefined;

      let pages = 0;
      let upserted = 0;
      let haveMore = true;

      while (pages < maxPages && haveMore) {
        const page = await this.steam.getAppListPage({
          lastAppId: lastAppId || undefined,
          ifModifiedSince,
          maxResults,
          includeDlc: false,
        });

        if (!page.apps.length) {
          haveMore = false;
          break;
        }

        for (const app of page.apps) {
          await this.prisma.steamCatalogApp.upsert({
            where: { appId: app.appId },
            create: {
              appId: app.appId,
              name: app.name,
              lastModified: app.lastModified,
              priceChangeNumber: app.priceChangeNumber,
            },
            update: {
              name: app.name,
              lastModified: app.lastModified,
              priceChangeNumber: app.priceChangeNumber,
            },
          });
          upserted += 1;
        }

        lastAppId = page.lastAppId;
        haveMore = page.haveMore;
        pages += 1;

        state = await this.prisma.steamCatalogSyncState.update({
          where: { id: "default" },
          data: {
            lastAppId,
            lastPageCount: page.apps.length,
            lastSyncedAt: new Date(),
            status: "running",
          },
        });

        if (!haveMore) break;
        await new Promise((r) => setTimeout(r, 400));
      }

      const totalApps = await this.prisma.steamCatalogApp.count();
      const newestMod = await this.prisma.steamCatalogApp.aggregate({
        _max: { lastModified: true },
      });

      // Full pass complete → next runs can use if_modified_since.
      const completedFullPass = !haveMore && lastAppId > 0;
      await this.prisma.steamCatalogSyncState.update({
        where: { id: "default" },
        data: {
          lastAppId: haveMore ? lastAppId : 0,
          ifModifiedSince: completedFullPass
            ? newestMod._max.lastModified ||
              Math.floor(Date.now() / 1000)
            : state.ifModifiedSince,
          totalApps,
          lastSyncedAt: new Date(),
          status: "idle",
          error: null,
        },
      });

      this.logger.log(
        `Catalog sync: pages=${pages} upserted=${upserted} total=${totalApps} haveMore=${haveMore}`,
      );

      return {
        ok: true as const,
        pages,
        upserted,
        haveMore,
        totalApps,
        lastAppId: haveMore ? lastAppId : 0,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.steamCatalogSyncState
        .upsert({
          where: { id: "default" },
          create: { id: "default", status: "failed", error: message },
          update: { status: "failed", error: message },
        })
        .catch(() => undefined);
      this.logger.error(`Catalog sync failed: ${message}`);
      return { ok: false as const, reason: "error" as const, error: message };
    } finally {
      await this.cache.releaseLock(LOCK_KEY).catch(() => undefined);
    }
  }

  async search(query: string, limit = 20) {
    const q = query.trim();
    if (!q) return [];
    return this.prisma.steamCatalogApp.findMany({
      where: { name: { contains: q } },
      take: Math.min(50, Math.max(1, limit)),
      orderBy: { name: "asc" },
    });
  }
}
