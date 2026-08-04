import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { PrismaService } from "../prisma/prisma.service";
import { AuthAbuseService } from "../auth/abuse/auth-abuse.service";
import { isCronEnabled } from "../cron/cron-enabled";
import { CronRunnerService } from "../cron/cron-runner.service";
import {
  CRON_JOB_NAMES,
  getCronSchedule,
  type ScheduledCronJobName,
} from "../cron/cron-schedules";
import { InternalCronService } from "../cron/internal-cron.service";
import { JobsService } from "../cron/jobs.service";
import {
  WATCH_CRON_SYNC,
  type WatchCronSync,
} from "../cron/watch-cron.token";
import { SyncService } from "../sync/sync.service";
import { CostService } from "../cost/cost.service";
import { AccountsService } from "../accounts/accounts.service";
import { CatalogService } from "../steam/catalog.service";
import { hashPassword } from "../auth/password";
import { isAdminEmail } from "../auth/admin-emails";
import {
  getSignupEnabledSetting,
  isSignupOpen,
  setSignupEnabled,
} from "../auth/signup-policy";
import { normalizeEmail } from "../auth/abuse/disposable-emails";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly abuse: AuthAbuseService,
    private readonly cron: InternalCronService,
    private readonly cronJobs: JobsService,
    private readonly cronRunner: CronRunnerService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly sync: SyncService,
    private readonly cost: CostService,
    private readonly accounts: AccountsService,
    private readonly catalog: CatalogService,
    @Optional()
    @Inject(WATCH_CRON_SYNC)
    private readonly watchCron: WatchCronSync | null,
  ) {}

  async overview() {
    const [
      userCount,
      adminCount,
      syncPending,
      syncRunning,
      syncFailed,
      enrichPending,
      titleEnrichPending,
      importPending,
      signupOpen,
      signupEnabled,
      catalog,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isAdmin: true } }),
      this.prisma.syncJob.count({ where: { status: "pending" } }),
      this.prisma.syncJob.count({ where: { status: "running" } }),
      this.prisma.syncJob.count({ where: { status: "failed" } }),
      this.prisma.enrichmentJob.count({ where: { status: "pending" } }),
      this.prisma.titleEnrichmentJob.count({ where: { status: "pending" } }),
      this.prisma.importJob.count({
        where: { status: { in: ["pending", "running"] } },
      }),
      isSignupOpen(this.prisma),
      getSignupEnabledSetting(this.prisma),
      this.catalog.getStatus(),
    ]);

    const musicHealth = { ok: true, service: "questorylabs-music", embedded: true };
    const watchHealth = { ok: true, service: "questorylabs-watch", embedded: true };

    const recentCron = await this.prisma.cronRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    return {
      users: { total: userCount, admins: adminCount },
      signup: { open: signupOpen, enabledSetting: signupEnabled },
      syncJobs: {
        pending: syncPending,
        running: syncRunning,
        failed: syncFailed,
      },
      enrichment: {
        musicPending: enrichPending,
        watchPending: titleEnrichPending,
        importsActive: importPending,
      },
      catalog,
      music: musicHealth,
      watch: watchHealth,
      abuse: this.abuse.getMetrics(),
      recentCronRuns: recentCron.map(serializeCronRun),
    };
  }

  async getSettings() {
    const signupEnabled = await getSignupEnabledSetting(this.prisma);
    const signupOpen = await isSignupOpen(this.prisma);
    return { signupEnabled, signupOpen, abuse: this.abuse.getMetrics() };
  }

  async patchSettings(body: { signupEnabled?: boolean }) {
    if (typeof body.signupEnabled === "boolean") {
      await setSignupEnabled(this.prisma, body.signupEnabled);
    }
    return this.getSettings();
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        personaName: true,
        avatarUrl: true,
        createdAt: true,
        lastSyncedAt: true,
        accounts: {
          where: { provider: "steam" },
          select: { providerAccountId: true, displayName: true },
          take: 1,
        },
      },
    });
    return {
      startFreshEnabled: isDevelopmentMode(),
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        isAdmin: u.isAdmin || isAdminEmail(u.email),
        personaName: u.personaName,
        avatarUrl: u.avatarUrl,
        steamId: u.accounts[0]?.providerAccountId ?? null,
        createdAt: u.createdAt.toISOString(),
        lastSyncedAt: u.lastSyncedAt?.toISOString() ?? null,
      })),
    };
  }

  async createUser(body: {
    personaName: string;
    email: string;
    password: string;
  }) {
    const email = normalizeEmail(body.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException("Email already in use");
    }

    const personaName = body.personaName.trim().slice(0, 64);
    if (!personaName) {
      throw new BadRequestException("Username is required");
    }

    if (body.password.length < 10 || body.password.length > 128) {
      throw new BadRequestException("Password must be 10–128 characters");
    }

    const passwordHash = await hashPassword(body.password);
    const isAdmin = isAdminEmail(email);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        personaName,
        isAdmin,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin || isAdminEmail(user.email),
        personaName: user.personaName,
        steamId: null,
        createdAt: user.createdAt.toISOString(),
        lastSyncedAt: null,
      },
    };
  }

  async patchUser(
    id: string,
    body: {
      email?: string;
      password?: string;
      isAdmin?: boolean;
      personaName?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    const data: {
      email?: string;
      passwordHash?: string;
      isAdmin?: boolean;
      personaName?: string;
    } = {};

    if (typeof body.email === "string") {
      data.email = normalizeEmail(body.email);
    }
    if (typeof body.password === "string") {
      if (body.password.length < 10 || body.password.length > 128) {
        throw new BadRequestException("Password must be 10–128 characters");
      }
      data.passwordHash = await hashPassword(body.password);
    }
    if (typeof body.isAdmin === "boolean") {
      if (user.isAdmin && !body.isAdmin) {
        const adminCount = await this.prisma.user.count({
          where: { isAdmin: true },
        });
        if (adminCount <= 1) {
          throw new ForbiddenException("Cannot demote the last admin");
        }
      }
      data.isAdmin = body.isAdmin;
    }
    if (typeof body.personaName === "string" && body.personaName.trim()) {
      data.personaName = body.personaName.trim().slice(0, 64);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
    return {
      user: {
        id: updated.id,
        email: updated.email,
        isAdmin: updated.isAdmin,
        personaName: updated.personaName,
      },
    };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    if (user.isAdmin) {
      const adminCount = await this.prisma.user.count({
        where: { isAdmin: true },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException("Cannot delete the last admin");
      }
    }
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Wipe all user-owned data while keeping the User row and linked Account
   * identities (e.g. Steam) so they can sign in and re-sync from a clean slate.
   * Development only (`NODE_ENV=development`).
   */
  async resetUserData(id: string) {
    if (!isDevelopmentMode()) {
      throw new ForbiddenException(
        "Start fresh is only available when NODE_ENV=development",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        accounts: {
          where: { provider: "steam" },
          select: { providerAccountId: true },
          take: 1,
        },
      },
    });
    if (!user) throw new NotFoundException("User not found");

    const steamId = user.accounts[0]?.providerAccountId ?? null;

    await this.prisma.$transaction(async (tx) => {
      // Sequential deletes keep SQLite interactive transactions reliable.
      await tx.libraryEntry.deleteMany({ where: { userId: id } });
      await tx.wishlistItem.deleteMany({ where: { userId: id } });
      await tx.purchase.deleteMany({ where: { userId: id } });
      await tx.friendship.deleteMany({ where: { userId: id } });
      await tx.familyGroup.deleteMany({ where: { ownerId: id } });
      await tx.familyMember.deleteMany({ where: { userId: id } });
      await tx.collection.deleteMany({ where: { userId: id } });
      await tx.syncJob.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.storeAccount.deleteMany({ where: { userId: id } });
      await tx.apiKey.deleteMany({ where: { userId: id } });
      await tx.listen.deleteMany({ where: { userId: id } });
      await tx.listenHourBucket.deleteMany({ where: { userId: id } });
      await tx.playingNow.deleteMany({ where: { userId: id } });
      await tx.sourceConnection.deleteMany({ where: { userId: id } });
      await tx.watchEvent.deleteMany({ where: { userId: id } });
      await tx.watchHourBucket.deleteMany({ where: { userId: id } });
      await tx.importJob.deleteMany({ where: { userId: id } });
      await tx.titleListState.deleteMany({ where: { userId: id } });

      if (steamId) {
        await tx.friendLibraryCache.deleteMany({
          where: { ownerSteamId: steamId },
        });
      }

      await tx.user.update({
        where: { id },
        data: { lastSyncedAt: null },
      });
    });

    this.logger.log(`Reset user data for ${id}`);
    return { ok: true };
  }

  async listCronRuns(opts: { page: number; pageSize: number }) {
    const { page, pageSize } = opts;
    const skip = (page - 1) * pageSize;
    const [total, runs] = await Promise.all([
      this.prisma.cronRun.count(),
      this.prisma.cronRun.findMany({
        orderBy: { startedAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      runs: runs.map(serializeCronRun),
    };
  }

  async cronStatus() {
    const enabled = isCronEnabled();
    const secretConfigured = Boolean((process.env.CRON_SECRET || "").trim());

    const lastRuns = await this.prisma.cronRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    const lastByJob = new Map<string, (typeof lastRuns)[number]>();
    for (const run of lastRuns) {
      if (!lastByJob.has(run.jobName)) {
        lastByJob.set(run.jobName, run);
      }
    }

    const statusJobNames = [
      ...CRON_JOB_NAMES,
      "trakt-sync",
      "anilist-sync",
      "mal-sync",
      "kitsu-sync",
      "bangumi-sync",
      "shikimori-sync",
    ] as const;

    const jobs = statusJobNames.map((name) => {
      let schedule: string | null = null;
      if (
        name === "daily-refresh" ||
        name === "recover-failed-sync" ||
        name === "watch-sync" ||
        name === "catalog-sync"
      ) {
        schedule = getCronSchedule(name as ScheduledCronJobName);
      } else if (
        name === "trakt-sync" ||
        name === "anilist-sync" ||
        name === "mal-sync" ||
        name === "kitsu-sync" ||
        name === "bangumi-sync" ||
        name === "shikimori-sync"
      ) {
        schedule = getCronSchedule("watch-sync");
      }

      const registryName =
        name === "trakt-sync" ||
        name === "anilist-sync" ||
        name === "mal-sync" ||
        name === "kitsu-sync" ||
        name === "bangumi-sync" ||
        name === "shikimori-sync"
          ? "watch-sync"
          : name;

      let registered = false;
      let running = false;
      let nextDate: string | null = null;
      try {
        const job = this.schedulerRegistry.getCronJob(registryName);
        registered = true;
        running = Boolean(job.running);
        nextDate = cronJobNextDateIso(job);
      } catch {
        registered = false;
      }

      const last = lastByJob.get(name);
      return {
        name,
        schedule,
        registered,
        running,
        nextDate,
        lastRun: last ? serializeCronRun(last) : null,
      };
    });

    return { enabled, secretConfigured, jobs };
  }

  async triggerCron(
    jobName: string,
    adminUserId: string,
  ): Promise<Record<string, unknown>> {
    const { runId, result } = await this.cronRunner.run(
      jobName,
      "admin",
      async () => {
        switch (jobName) {
          case "daily-refresh":
            return this.cron.dailyRefresh();
          case "recover-failed-sync":
            return this.cron.recoverFailedSync();
          case "watch-sync":
            if (!this.watchCron) {
              throw new BadRequestException("Watch module unavailable");
            }
            await this.cronJobs.runWatchSync();
            return { ok: true };
          case "catalog-sync":
            return this.cron.syncCatalog({});
          case "trakt-sync":
            if (!this.watchCron) {
              throw new BadRequestException("Watch module unavailable");
            }
            return this.watchCron.runTraktSync();
          case "anilist-sync":
            if (!this.watchCron) {
              throw new BadRequestException("Watch module unavailable");
            }
            return this.watchCron.runAnilistSync();
          case "mal-sync":
            if (!this.watchCron) {
              throw new BadRequestException("Watch module unavailable");
            }
            return this.watchCron.runMalSync();
          case "kitsu-sync":
            if (!this.watchCron) {
              throw new BadRequestException("Watch module unavailable");
            }
            return this.watchCron.runKitsuSync();
          case "bangumi-sync":
            if (!this.watchCron) {
              throw new BadRequestException("Watch module unavailable");
            }
            return this.watchCron.runBangumiSync();
          case "shikimori-sync":
            if (!this.watchCron) {
              throw new BadRequestException("Watch module unavailable");
            }
            return this.watchCron.runShikimoriSync();
          default:
            throw new BadRequestException(`Unknown job: ${jobName}`);
        }
      },
      { userId: adminUserId },
    );
    return { ok: true, runId, result };
  }

  async enrichmentOverview(opts: {
    domain: "music" | "watch" | "game";
    page: number;
    pageSize: number;
    status: "all" | "pending" | "running" | "completed" | "failed";
  }) {
    const { domain, page, pageSize, status } = opts;
    const skip = (page - 1) * pageSize;
    const statusFilter = status === "all" ? undefined : status;

    const [musicCounts, watchCounts, gameCounts] = await Promise.all([
      this.enrichmentStatusCounts("music"),
      this.enrichmentStatusCounts("watch"),
      this.enrichmentStatusCounts("game"),
    ]);

    if (domain === "music") {
      const where = statusFilter ? { status: statusFilter } : {};
      const [total, rows] = await Promise.all([
        this.prisma.enrichmentJob.count({ where }),
        this.prisma.enrichmentJob.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          select: {
            id: true,
            trackId: true,
            status: true,
            attempts: true,
            lastError: true,
            createdAt: true,
            completedAt: true,
            track: {
              select: {
                title: true,
                recordingMbid: true,
                artist: { select: { name: true } },
              },
            },
          },
        }),
      ]);
      return {
        domain,
        page,
        pageSize,
        total,
        counts: { music: musicCounts, watch: watchCounts, game: gameCounts },
        items: rows.map((j) => ({
          id: j.id,
          refId: j.trackId,
          label: j.track.title,
          detail: [
            j.track.artist.name,
            j.track.recordingMbid
              ? `mbid ${j.track.recordingMbid.slice(0, 8)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          status: j.status,
          attempts: j.attempts,
          error: j.lastError,
          createdAt: j.createdAt.toISOString(),
          completedAt: j.completedAt?.toISOString() ?? null,
        })),
      };
    }

    if (domain === "watch") {
      const where = statusFilter ? { status: statusFilter } : {};
      const [total, rows] = await Promise.all([
        this.prisma.titleEnrichmentJob.count({ where }),
        this.prisma.titleEnrichmentJob.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          select: {
            id: true,
            titleId: true,
            status: true,
            attempts: true,
            lastError: true,
            createdAt: true,
            completedAt: true,
            title: { select: { name: true, type: true, year: true } },
          },
        }),
      ]);
      return {
        domain,
        page,
        pageSize,
        total,
        counts: { music: musicCounts, watch: watchCounts, game: gameCounts },
        items: rows.map((j) => ({
          id: j.id,
          refId: j.titleId,
          label: j.title.name,
          detail: [j.title.type, j.title.year].filter(Boolean).join(" · ") || null,
          status: j.status,
          attempts: j.attempts,
          error: j.lastError,
          createdAt: j.createdAt.toISOString(),
          completedAt: j.completedAt?.toISOString() ?? null,
        })),
      };
    }

    const where = {
      type: "metadata-refresh",
      ...(statusFilter ? { status: statusFilter } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.syncJob.count({ where }),
      this.prisma.syncJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          status: true,
          error: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
          user: { select: { personaName: true, email: true } },
        },
      }),
    ]);
    return {
      domain,
      page,
      pageSize,
      total,
      counts: { music: musicCounts, watch: watchCounts, game: gameCounts },
      items: rows.map((j) => ({
        id: j.id,
        refId: j.userId,
        label: j.user.personaName || j.user.email || j.userId.slice(0, 8),
        detail: j.user.email,
        status: j.status,
        attempts: null as number | null,
        error: j.error,
        createdAt: j.createdAt.toISOString(),
        completedAt: j.finishedAt?.toISOString() ?? null,
        startedAt: j.startedAt?.toISOString() ?? null,
      })),
    };
  }

  private async enrichmentStatusCounts(
    domain: "music" | "watch" | "game",
  ): Promise<StatusBucket> {
    const statuses = ["pending", "running", "completed", "failed"] as const;
    if (domain === "music") {
      const counts = await Promise.all(
        statuses.map((status) =>
          this.prisma.enrichmentJob.count({ where: { status } }),
        ),
      );
      return bucketFromCounts(counts);
    }
    if (domain === "watch") {
      const counts = await Promise.all(
        statuses.map((status) =>
          this.prisma.titleEnrichmentJob.count({ where: { status } }),
        ),
      );
      return bucketFromCounts(counts);
    }
    const counts = await Promise.all(
      statuses.map((status) =>
        this.prisma.syncJob.count({
          where: { type: "metadata-refresh", status },
        }),
      ),
    );
    return bucketFromCounts(counts);
  }

  async triggerEnrichment(action: string, adminUserId: string) {
    if (action === "catalog-sync" || action === "recover-failed-sync") {
      return this.triggerCron(action, adminUserId);
    }
    throw new BadRequestException(`Unknown enrichment action: ${action}`);
  }

  async refreshPricesForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    return this.cost.refreshPrices(userId);
  }

  async syncUser(userId: string) {
    const steamId = await this.accounts.getSteamId(userId);
    if (!steamId) {
      throw new BadRequestException("User has no linked Steam account");
    }
    return this.sync.enqueueAll(userId, steamId, { force: true });
  }

}

type StatusBucket = {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
};

function bucketFromCounts([pending, running, completed, failed]: number[]) {
  return {
    pending,
    running,
    completed,
    failed,
    total: pending + running + completed + failed,
  };
}

function isDevelopmentMode() {
  return process.env.NODE_ENV === "development";
}

function cronJobNextDateIso(job: CronJob): string | null {
  try {
    const next = job.nextDate();
    if (!next) return null;
    if (typeof next.toJSDate === "function") {
      return next.toJSDate().toISOString();
    }
    if (next instanceof Date) {
      return next.toISOString();
    }
    return String(next);
  } catch {
    return null;
  }
}

function serializeCronRun(run: {
  id: string;
  jobName: string;
  status: string;
  triggeredBy: string;
  triggeredByUserId: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
  meta: string;
}) {
  return {
    id: run.id,
    jobName: run.jobName,
    status: run.status,
    triggeredBy: run.triggeredBy,
    triggeredByUserId: run.triggeredByUserId,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    error: run.error,
    meta: run.meta,
  };
}
