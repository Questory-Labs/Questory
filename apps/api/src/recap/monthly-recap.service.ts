import { ConflictException, Injectable, Logger } from "@nestjs/common";
import type { RewindAllStats, RewindStatsResponse } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FeatureFlagsService } from "../features/feature-flags.service";
import { RewindAiService } from "../rewind/rewind-ai.service";
import type { RewindAiDomain } from "../lib/rewind-ai-client";
import { AnalyticsService as MusicAnalyticsService } from "../music/analytics/analytics.service";
import { AnalyticsService as WatchAnalyticsService } from "../watch/analytics/analytics.service";
import { ReadAnalyticsService } from "../read/analytics/analytics.service";
import { GamesRewindService } from "../games/rewind/games-rewind.service";
import { previousRewindPeriod } from "@questorylabs/shared";
import { zonedPeriodBounds } from "../lib/rewind-stats";
import { busiestSincePeriod, combineDaily } from "./rewind-combined";

export const RECAP_GLOBAL_KEY = "recap.monthly.enabled";
export const RECAP_USER_PREFIX = "recap.monthly.user:";
export const RECAP_NOTIFICATION_TYPE = "monthly-recap";
const USER_PAGE = 200;
const MAX_USERS_PER_RUN = 2000;
const MAX_CONSECUTIVE_FAILURES = 3;
const BUSIEST_LOOKBACK_MONTHS = 12;

type RecapDomain = Exclude<RewindAiDomain, "all">;

const DOMAIN_HREF: Record<RecapDomain, string> = {
  music: "/music/rewind",
  watch: "/watch/rewind",
  read: "/read/rewind",
  games: "/library/rewind",
};

const DOMAIN_LABEL: Record<RecapDomain, string> = {
  music: "music",
  watch: "watching",
  read: "reading",
  games: "games",
};

export function previousMonthPeriod(now: Date): string {
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

export function statsHaveActivity(stats: RewindStatsResponse): boolean {
  switch (stats.domain) {
    case "music":
      return stats.totalPlays > 0;
    case "watch":
      return stats.totalWatches > 0;
    case "read":
      return stats.totalEvents > 0;
    case "games":
      return stats.totalMinutes > 0 || stats.sessions > 0;
    case "all":
      return Object.values(stats.domains).some((sub) => sub && statsHaveActivity(sub));
  }
}

export type RecapRunResult = {
  period: string;
  users: number;
  generated: number;
  notified: number;
  failed: number;
  aborted: boolean;
};

@Injectable()
export class MonthlyRecapService {
  private readonly logger = new Logger(MonthlyRecapService.name);
  private inFlight: Promise<RecapRunResult> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly rewindAi: RewindAiService,
    private readonly music: MusicAnalyticsService,
    private readonly watch: WatchAnalyticsService,
    private readonly read: ReadAnalyticsService,
    private readonly games: GamesRewindService,
  ) {}

  async isGloballyEnabled(): Promise<boolean> {
    const row = await this.prisma.appConfig.findUnique({ where: { key: RECAP_GLOBAL_KEY } });
    return row?.value === "true";
  }

  async setGlobal(enabled: boolean): Promise<void> {
    await this.prisma.appConfig.upsert({
      where: { key: RECAP_GLOBAL_KEY },
      create: { key: RECAP_GLOBAL_KEY, value: String(enabled) },
      update: { value: String(enabled) },
    });
  }

  async getUserSetting(userId: string): Promise<{ monthly: boolean; global: boolean }> {
    const [row, global] = await Promise.all([
      this.prisma.appConfig.findUnique({ where: { key: `${RECAP_USER_PREFIX}${userId}` } }),
      this.isGloballyEnabled(),
    ]);
    return { monthly: global || row?.value === "true", global };
  }

  async setUserSetting(userId: string, monthly: boolean): Promise<{ monthly: boolean; global: boolean }> {
    const key = `${RECAP_USER_PREFIX}${userId}`;
    await this.prisma.appConfig.upsert({
      where: { key },
      create: { key, value: String(monthly) },
      update: { value: String(monthly) },
    });
    return this.getUserSetting(userId);
  }

  get running(): boolean {
    return this.inFlight !== null;
  }

  run(now = new Date()): Promise<RecapRunResult> {
    if (this.inFlight) throw new ConflictException("Monthly recap is already running");
    const run = this.runOnce(now).finally(() => {
      this.inFlight = null;
    });
    this.inFlight = run;
    return run;
  }

  private async runOnce(now: Date): Promise<RecapRunResult> {
    const period = previousMonthPeriod(now);
    const result: RecapRunResult = {
      period,
      users: 0,
      generated: 0,
      notified: 0,
      failed: 0,
      aborted: false,
    };
    const domains = await this.enabledDomains();
    let consecutiveFailures = 0;

    for await (const userId of this.recipients()) {
      result.users += 1;
      const ready: RecapDomain[] = [];
      for (const domain of domains) {
        try {
          const stats = await this.loadStats(domain, userId, period);
          if (!statsHaveActivity(stats)) continue;
          await this.rewindAi.serve({
            userId,
            domain,
            period,
            forceRedo: false,
            loadStats: async () => stats,
          });
          ready.push(domain);
          result.generated += 1;
          consecutiveFailures = 0;
        } catch (err) {
          result.failed += 1;
          consecutiveFailures += 1;
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`recap ${domain} for ${userId} failed: ${message}`);
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            result.aborted = true;
            this.logger.error(`monthly recap aborted after ${consecutiveFailures} consecutive failures`);
            return result;
          }
        }
      }
      if (ready.length && (await this.notify(userId, period, ready))) {
        result.notified += 1;
      }
    }
    return result;
  }

  async combinedStats(userId: string, period: string, timeZone: string): Promise<RewindAllStats> {
    const domains: RewindAllStats["domains"] = {};
    const enabled = await this.enabledDomains();
    for (const domain of enabled) {
      const stats = await this.loadStats(domain, userId, period, timeZone);
      if (statsHaveActivity(stats)) {
        (domains as Record<string, RewindStatsResponse>)[domain] = stats;
      }
    }
    return {
      domain: "all",
      period,
      domains,
      daily: combineDaily(domains),
      busiestSince:
        period.length === 7
          ? await this.busiestSince(userId, period, timeZone, enabled)
          : null,
    };
  }

  private async busiestSince(
    userId: string,
    period: string,
    timeZone: string,
    domains: RecapDomain[],
  ): Promise<string | null> {
    const current = await this.activityCount(userId, period, timeZone, domains);
    if (current <= 0) return null;
    const prior: { period: string; count: number }[] = [];
    let cursor = period;
    for (let i = 0; i < BUSIEST_LOOKBACK_MONTHS; i += 1) {
      cursor = previousRewindPeriod(cursor);
      const count = await this.activityCount(userId, cursor, timeZone, domains);
      prior.push({ period: cursor, count });
      if (count > current) break;
    }
    return busiestSincePeriod(current, prior);
  }

  private async activityCount(
    userId: string,
    period: string,
    timeZone: string,
    domains: RecapDomain[],
  ): Promise<number> {
    const { start, end } = zonedPeriodBounds(period, timeZone);
    const counts = await Promise.all(
      domains.map((domain) => {
        switch (domain) {
          case "music":
            return this.prisma.listen.count({
              where: { userId, listenedAt: { gte: start, lt: end } },
            });
          case "watch":
            return this.prisma.watchEvent.count({
              where: { userId, watchedAt: { gte: start, lt: end } },
            });
          case "read":
            return this.prisma.readEvent.count({
              where: { userId, readAt: { gte: start, lt: end } },
            });
          case "games":
            return this.prisma.playSession.count({
              where: { userId, endedAt: { gte: start, lt: end } },
            });
        }
      }),
    );
    return counts.reduce((a, b) => a + b, 0);
  }

  private async enabledDomains(): Promise<RecapDomain[]> {
    const out: RecapDomain[] = [];
    for (const domain of ["music", "watch", "read"] as const) {
      if (await this.flags.isDomainEnabled(domain)) out.push(domain);
    }
    out.push("games");
    return out;
  }

  private async *recipients(): AsyncGenerator<string> {
    let yielded = 0;
    if (await this.isGloballyEnabled()) {
      const optedOut = new Set(
        (
          await this.prisma.appConfig.findMany({
            where: { key: { startsWith: RECAP_USER_PREFIX }, value: "false" },
            select: { key: true },
            take: MAX_USERS_PER_RUN,
          })
        ).map((row) => row.key.slice(RECAP_USER_PREFIX.length)),
      );
      let cursor: string | undefined;
      while (yielded < MAX_USERS_PER_RUN) {
        const page = await this.prisma.user.findMany({
          select: { id: true },
          orderBy: { id: "asc" },
          take: USER_PAGE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        if (!page.length) return;
        for (const { id } of page) {
          if (optedOut.has(id)) continue;
          yielded += 1;
          yield id;
          if (yielded >= MAX_USERS_PER_RUN) return;
        }
        cursor = page[page.length - 1].id;
      }
      return;
    }
    const rows = await this.prisma.appConfig.findMany({
      where: { key: { startsWith: RECAP_USER_PREFIX }, value: "true" },
      select: { key: true },
      orderBy: { key: "asc" },
      take: MAX_USERS_PER_RUN,
    });
    for (const row of rows) yield row.key.slice(RECAP_USER_PREFIX.length);
  }

  private async loadStats(
    domain: RecapDomain,
    userId: string,
    period: string,
    timeZone = "UTC",
  ): Promise<RewindStatsResponse> {
    switch (domain) {
      case "music":
        return (await this.music.rewindStats(userId, period, timeZone)) as RewindStatsResponse;
      case "watch":
        return (await this.watch.rewindStats(userId, period, timeZone)) as RewindStatsResponse;
      case "read":
        return (await this.read.rewindStats(userId, period, timeZone)) as RewindStatsResponse;
      case "games":
        return this.games.rewindStats(userId, period, timeZone);
    }
  }

  private async notify(userId: string, period: string, domains: RecapDomain[]): Promise<boolean> {
    const dedupeKey = `"period":"${period}"`;
    const existing = await this.prisma.notification.findFirst({
      where: { userId, type: RECAP_NOTIFICATION_TYPE, meta: { contains: dedupeKey } },
      select: { id: true },
    });
    if (existing) return false;
    const month = monthLabel(period);
    const parts = domains.map((d) => DOMAIN_LABEL[d]);
    const list =
      parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
    await this.prisma.notification.create({
      data: {
        userId,
        type: RECAP_NOTIFICATION_TYPE,
        title: `Your ${month} recap is ready`,
        body: `See how your month of ${list} went.`,
        href: DOMAIN_HREF[domains[0]],
        meta: JSON.stringify({ period, domains }),
      },
    });
    return true;
  }
}
