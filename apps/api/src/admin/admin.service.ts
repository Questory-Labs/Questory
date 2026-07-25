import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthAbuseService } from "../auth/abuse/auth-abuse.service";
import { InternalCronService } from "../cron/internal-cron.service";
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

  async listCronRuns(take = 50) {
    const runs = await this.prisma.cronRun.findMany({
      orderBy: { startedAt: "desc" },
      take: Math.min(100, Math.max(1, take)),
    });
    return { runs: runs.map(serializeCronRun) };
  }

  async triggerCron(
    jobName: string,
    adminUserId: string,
  ): Promise<Record<string, unknown>> {
    const run = await this.prisma.cronRun.create({
      data: {
        jobName,
        status: "running",
        triggeredBy: "admin",
        triggeredByUserId: adminUserId,
      },
    });

    try {
      let result: unknown;
      switch (jobName) {
        case "daily-refresh":
          result = await this.cron.dailyRefresh();
          break;
        case "recover-failed-sync":
          result = await this.cron.recoverFailedSync();
          break;
        case "catalog-sync":
          result = await this.cron.syncCatalog({});
          break;
        case "trakt-sync":
          if (!this.watchCron) {
            throw new BadRequestException("Watch module unavailable");
          }
          result = await this.watchCron.runTraktSync();
          break;
        case "anilist-sync":
          if (!this.watchCron) {
            throw new BadRequestException("Watch module unavailable");
          }
          result = await this.watchCron.runAnilistSync();
          break;
        default:
          throw new BadRequestException(`Unknown job: ${jobName}`);
      }

      await this.prisma.cronRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          finishedAt: new Date(),
          meta: JSON.stringify(result ?? {}),
        },
      });
      return { ok: true, runId: run.id, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.cronRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          error: message,
        },
      });
      throw err;
    }
  }

  async enrichmentOverview() {
    const [musicJobs, titleJobs, syncMeta] = await Promise.all([
      this.prisma.enrichmentJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          trackId: true,
          status: true,
          attempts: true,
          lastError: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      this.prisma.titleEnrichmentJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          titleId: true,
          status: true,
          attempts: true,
          lastError: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      this.prisma.syncJob.findMany({
        where: { type: "metadata-refresh" },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return {
      music: musicJobs.map((j) => ({
        ...j,
        createdAt: j.createdAt.toISOString(),
        completedAt: j.completedAt?.toISOString() ?? null,
      })),
      watch: titleJobs.map((j) => ({
        ...j,
        createdAt: j.createdAt.toISOString(),
        completedAt: j.completedAt?.toISOString() ?? null,
      })),
      metadataRefresh: syncMeta.map((j) => ({
        id: j.id,
        userId: j.userId,
        status: j.status,
        error: j.error,
        startedAt: j.startedAt?.toISOString() ?? null,
        finishedAt: j.finishedAt?.toISOString() ?? null,
      })),
    };
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
