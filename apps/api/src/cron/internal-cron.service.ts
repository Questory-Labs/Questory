import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { SyncService } from "../sync/sync.service";
import { CatalogService } from "../steam/catalog.service";

const CATALOG_LOCK_KEY = "steam:catalog:sync:lock";
const STUCK_JOB_MS = 60 * 60 * 1000;

@Injectable()
export class InternalCronService {
  private readonly logger = new Logger(InternalCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly sync: SyncService,
    private readonly catalog: CatalogService,
  ) {}

  syncCatalog(opts: { forceFull?: boolean; maxPages?: number }) {
    return this.catalog.syncIncremental(opts);
  }

  async dailyRefresh() {
    const steamAccounts = await this.prisma.account.findMany({
      where: { provider: "steam" },
      select: { userId: true, providerAccountId: true },
    });

    let enqueued = 0;
    let failed = 0;
    for (const account of steamAccounts) {
      try {
        await this.sync.enqueueDailyLibrarySync(
          account.userId,
          account.providerAccountId,
        );
        enqueued += 1;
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Daily library sync enqueue failed for user ${account.userId}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Daily library sync: users=${steamAccounts.length} enqueued=${enqueued} failed=${failed}`,
    );
    return { users: steamAccounts.length, enqueued, failed };
  }

  async syncPricesDaily() {
    const steamAccounts = await this.prisma.account.findMany({
      where: { provider: "steam" },
      select: { userId: true, providerAccountId: true },
    });

    let enqueued = 0;
    let failed = 0;
    for (const account of steamAccounts) {
      try {
        await this.sync.enqueueDailyPriceSync(
          account.userId,
          account.providerAccountId,
        );
        enqueued += 1;
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Daily price sync enqueue failed for user ${account.userId}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Daily price sync: users=${steamAccounts.length} enqueued=${enqueued} failed=${failed}`,
    );
    return { users: steamAccounts.length, enqueued, failed };
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

    // Music / Letterboxd ImportJob rows share this table; mark orphans failed
    // so a crashed in-process import cannot block re-upload forever.
    const stuckImportRunning = await this.prisma.importJob.updateMany({
      where: {
        status: "running",
        createdAt: { lt: cutoff },
      },
      data: {
        status: "failed",
        completedAt: new Date(),
        lastError: "Recovered: stuck running",
      },
    });

    const stuckImportPending = await this.prisma.importJob.updateMany({
      where: {
        status: "pending",
        createdAt: { lt: cutoff },
      },
      data: {
        status: "failed",
        completedAt: new Date(),
        lastError: "Recovered: orphaned pending",
      },
    });

    const result = {
      stuckRunningJobs: stuckRunning.count,
      stuckPendingJobs: stuckPending.count,
      stuckImportRunningJobs: stuckImportRunning.count,
      stuckImportPendingJobs: stuckImportPending.count,
      catalogReset,
      catalogLockCleared: true,
    };
    this.logger.log(
      `Sync recovery: running=${result.stuckRunningJobs} pending=${result.stuckPendingJobs}` +
        ` importsRunning=${result.stuckImportRunningJobs} importsPending=${result.stuckImportPendingJobs}` +
        ` catalogReset=${catalogReset}`,
    );
    return result;
  }
}
