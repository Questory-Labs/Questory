import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { SyncService } from "../sync/sync.service";

const CATALOG_LOCK_KEY = "steam:catalog:sync:lock";
const STUCK_JOB_MS = 60 * 60 * 1000;

@Injectable()
export class InternalCronService {
  private readonly logger = new Logger(InternalCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly sync: SyncService,
  ) {}

  async dailyRefresh() {
    const users = await this.prisma.user.findMany({
      select: { id: true, steamId: true },
    });

    let enqueued = 0;
    let failed = 0;
    for (const user of users) {
      if (!user.steamId) continue;
      try {
        await this.sync.enqueueDailyPriceStats(user.id, user.steamId);
        enqueued += 1;
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Daily refresh enqueue failed for user ${user.id}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Daily refresh: users=${users.length} enqueued=${enqueued} failed=${failed}`,
    );
    return { users: users.length, enqueued, failed };
  }

  async recoverFailedSync() {
    const cutoff = new Date(Date.now() - STUCK_JOB_MS);

    const stuckRunning = await this.prisma.syncJob.updateMany({
      where: {
        status: "running",
        startedAt: { lt: cutoff },
      },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: "Recovered: stuck running",
      },
    });

    const stuckPending = await this.prisma.syncJob.updateMany({
      where: {
        status: "pending",
        createdAt: { lt: cutoff },
      },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: "Recovered: orphaned pending",
      },
    });

    const catalogBefore = await this.prisma.steamCatalogSyncState.findUnique({
      where: { id: "default" },
    });
    let catalogReset = false;
    if (
      catalogBefore &&
      (catalogBefore.status === "failed" || catalogBefore.status === "running")
    ) {
      await this.prisma.steamCatalogSyncState.update({
        where: { id: "default" },
        data: { status: "idle", error: null },
      });
      catalogReset = true;
    }

    await this.cache.del(CATALOG_LOCK_KEY);

    const result = {
      stuckRunningJobs: stuckRunning.count,
      stuckPendingJobs: stuckPending.count,
      catalogReset,
      catalogLockCleared: true,
    };
    this.logger.log(
      `Sync recovery: running=${result.stuckRunningJobs} pending=${result.stuckPendingJobs} catalogReset=${catalogReset}`,
    );
    return result;
  }
}
