import { Injectable, Logger } from "@nestjs/common";
import type { ScraperDefinition } from "@questorylabs/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { ScraperProvidersService } from "../../scraper/scraper-providers.service";
import { ScraperEngineService } from "../../scraper/scraper-engine.service";
import { CatalogService } from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import {
  letterboxdWatchDedupeKey,
  watchedAtDayUtc,
} from "../imports/letterboxd-keys";
import { LetterboxdConnectService } from "./letterboxd-connect.service";
import { normalizeLetterboxdScrapeRows } from "./letterboxd-row-parse";

const SOURCE = "letterboxd";
const SOURCE_KEY = "letterboxd";

type ParsedRow = {
  title: string;
  year: number | null;
  dateStr: string;
  rating: number | null;
};

@Injectable()
export class LetterboxdScrapeSyncService {
  private readonly logger = new Logger(LetterboxdScrapeSyncService.name);
  private readonly syncingUsers = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly connect: LetterboxdConnectService,
    private readonly providers: ScraperProvidersService,
    private readonly engine: ScraperEngineService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
  ) {}

  async syncAll(): Promise<{
    users: number;
    imported: number;
    skipped: number;
    stopped: number;
  }> {
    const config = await this.providers.getPublishedDefinition(SOURCE_KEY);
    if (!config) {
      this.logger.debug("letterboxd scrape skipped (no published iteration)");
      return { users: 0, imported: 0, skipped: 0, stopped: 0 };
    }

    const connections = await this.connect.listConnections();
    let imported = 0;
    let skipped = 0;
    let stopped = 0;

    for (const conn of connections) {
      if (!conn.externalUserId) continue;
      const result = await this.syncUser(
        conn.userId,
        conn.externalUserId,
        config,
      );
      imported += result.imported;
      skipped += result.skipped;
      if (result.stoppedEarly) stopped += 1;
    }

    return {
      users: connections.length,
      imported,
      skipped,
      stopped,
    };
  }

  async syncUser(
    userId: string,
    username?: string,
    definitionOverride?: ScraperDefinition,
  ): Promise<{ imported: number; skipped: number; stoppedEarly: boolean }> {
    if (this.syncingUsers.has(userId)) {
      return { imported: 0, skipped: 0, stoppedEarly: false };
    }
    this.syncingUsers.add(userId);

    try {
      const config =
        definitionOverride != null
          ? definitionOverride
          : await this.providers.getPublishedDefinition(SOURCE_KEY);
      if (!config) {
        return { imported: 0, skipped: 0, stoppedEarly: false };
      }

      const status = await this.connect.getStatus(userId);
      const letterboxdId = username ?? status.username;
      if (!letterboxdId) {
        return { imported: 0, skipped: 0, stoppedEarly: false };
      }

      const macros = this.providers.buildMacroContext({
        letterboxdId,
      });
      macros["user.letterboxdId"] = letterboxdId;

      const knownKeys = await this.loadKnownDedupeKeys(userId);
      let imported = 0;
      let skipped = 0;
      let stoppedEarly = false;
      let latestDate: string | null = null;

      const importedTitleIds: string[] = [];

      await this.engine.run(config, macros, {
        onPage: async (rows, _page, _url) => {
          let foundKnown = false;

          for (const row of normalizeLetterboxdScrapeRows(rows)) {
            const parsed = this.parseRow(row);
            if (!parsed) {
              skipped += 1;
              continue;
            }

            const dedupeKey = letterboxdWatchDedupeKey(
              parsed.title,
              parsed.year,
              parsed.dateStr,
            );

            if (knownKeys.has(dedupeKey)) {
              foundKnown = true;
              skipped += 1;
              continue;
            }

            const watchedAt = watchedAtDayUtc(parsed.dateStr);
            if (!watchedAt) {
              skipped += 1;
              continue;
            }

            const title = await this.catalog.upsertTitle({
              type: "movie",
              name: parsed.title,
              year: parsed.year,
            });

            await this.catalog.recordWatch({
              userId,
              titleId: title.id,
              watchedAt,
              source: SOURCE,
              dedupeKey,
              action: "watch",
              rating: parsed.rating,
              precision: "day",
              rawPayload: JSON.stringify(row),
            });

            knownKeys.add(dedupeKey);
            importedTitleIds.push(title.id);
            imported += 1;
            if (!latestDate || parsed.dateStr > latestDate) {
              latestDate = parsed.dateStr;
            }
          }

          if (foundKnown && config.stop.onKnownEntry) {
            stoppedEarly = true;
            return "stop";
          }
          return "continue";
        },
      });

      if (imported > 0) {
        await this.catalog.rebuildWatchHourBuckets(userId);
        for (const titleId of importedTitleIds) {
          this.enrichment.enqueueTitle(titleId);
        }
      }

      await this.prisma.sourceConnection.update({
        where: {
          userId_provider: { userId, provider: "letterboxd" },
        },
        data: {
          lastSyncedAt: new Date(),
          ...(latestDate ? { syncCursor: latestDate } : {}),
        },
      });

      return { imported, skipped, stoppedEarly };
    } finally {
      this.syncingUsers.delete(userId);
    }
  }

  private async loadKnownDedupeKeys(userId: string): Promise<Set<string>> {
    const events = await this.prisma.watchEvent.findMany({
      where: {
        userId,
        OR: [
          { source: SOURCE },
          { source: "letterboxd_csv" },
          { dedupeKey: { startsWith: "letterboxd_csv:" } },
        ],
      },
      select: { dedupeKey: true },
    });
    return new Set(events.map((e) => e.dedupeKey));
  }

  private parseRow(row: Record<string, string | null>): ParsedRow | null {
    const title = row.title?.trim();
    const dateStr = row.date?.trim();
    if (!title || !dateStr) return null;

    const yearRaw = row.year?.trim();
    const year =
      yearRaw && Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : null;

    const ratingRaw = row.rating?.trim();
    const rating =
      ratingRaw && Number.isFinite(Number(ratingRaw))
        ? Number(ratingRaw)
        : null;

    return { title, year, dateStr, rating };
  }
}
