import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { HltbService } from "../steam/hltb.service";
import { HLTB_FRESH_DAYS } from "../games/games.constants";

export const HLTB_BACKFILL_LIMIT = 200;
export const HLTB_BACKFILL_CONCURRENCY = 2;
const BACKFILL_STATUSES = ["backlog", "playing", "shelved"];

export type HltbBackfillResult = {
  scanned: number;
  updated: number;
  missed: number;
  failed: number;
};

@Injectable()
export class HltbBackfillService {
  private readonly logger = new Logger(HltbBackfillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hltb: HltbService,
  ) {}

  async run(now = new Date()): Promise<HltbBackfillResult> {
    const staleBefore = new Date(
      now.getTime() - HLTB_FRESH_DAYS * 86_400_000,
    );
    const games = await this.prisma.game.findMany({
      where: {
        libraryEntries: {
          some: { userStatus: { in: BACKFILL_STATUSES }, hidden: false },
        },
        OR: [{ hltbSyncedAt: null }, { hltbSyncedAt: { lt: staleBefore } }],
      },
      select: { id: true, name: true },
      orderBy: { hltbSyncedAt: { sort: "asc", nulls: "first" } },
      take: HLTB_BACKFILL_LIMIT,
    });

    const result: HltbBackfillResult = {
      scanned: games.length,
      updated: 0,
      missed: 0,
      failed: 0,
    };
    let cursor = 0;
    const worker = async () => {
      while (cursor < games.length) {
        const game = games[cursor++]!;
        try {
          const live = await this.hltb.lookup(game.name);
          await this.prisma.game.update({
            where: { id: game.id },
            data: live
              ? {
                  hltbMainHours: live.mainHours,
                  hltbExtraHours: live.extraHours,
                  hltbCompletionistHours: live.completionistHours,
                  hltbSyncedAt: now,
                }
              : { hltbSyncedAt: now },
          });
          if (live) result.updated += 1;
          else result.missed += 1;
        } catch (err) {
          result.failed += 1;
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`hltb-backfill ${game.id} failed: ${message}`);
        }
      }
    };
    await Promise.all(
      Array.from({ length: HLTB_BACKFILL_CONCURRENCY }, () => worker()),
    );
    return result;
  }
}
