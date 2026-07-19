import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { ApiClient } from "./api-client";

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly api: ApiClient,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const dailyExpr = process.env.CRON_DAILY_SCHEDULE || "0 3 * * *";
    const recoveryExpr = process.env.CRON_RECOVERY_SCHEDULE || "*/15 * * * *";
    const watchExpr = process.env.CRON_WATCH_SCHEDULE || "0 */6 * * *";

    this.addJob("daily-refresh", dailyExpr, () => this.runDailyRefresh());
    this.addJob("recover-failed-sync", recoveryExpr, () =>
      this.runRecoverFailedSync(),
    );
    this.addJob("watch-sync", watchExpr, () => this.runWatchSync());

    this.logger.log(
      `Scheduled daily-refresh (${dailyExpr}), recover-failed-sync (${recoveryExpr}), watch-sync (${watchExpr})`,
    );
  }

  private addJob(name: string, cronTime: string, onTick: () => Promise<void>) {
    const job = new CronJob(cronTime, () => {
      void onTick().catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`${name} failed: ${message}`);
      });
    });
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }

  async runDailyRefresh() {
    this.logger.log("Starting daily-refresh");
    const result = await this.api.postInternal("/internal/cron/daily-refresh");
    this.logger.log(`daily-refresh done: ${JSON.stringify(result)}`);
  }

  async runRecoverFailedSync() {
    this.logger.log("Starting recover-failed-sync");
    const result = await this.api.postInternal(
      "/internal/cron/recover-failed-sync",
    );
    this.logger.log(`recover-failed-sync done: ${JSON.stringify(result)}`);
  }

  async runWatchSync() {
    this.logger.log("Starting watch-sync (Trakt + AniList)");
    try {
      const trakt = await this.api.postWatchInternal(
        "/internal/cron/trakt-sync",
      );
      this.logger.log(`trakt-sync done: ${JSON.stringify(trakt)}`);
    } catch (err) {
      this.logger.warn(
        `trakt-sync skipped/failed: ${err instanceof Error ? err.message : err}`,
      );
    }
    try {
      const ani = await this.api.postWatchInternal(
        "/internal/cron/anilist-sync",
      );
      this.logger.log(`anilist-sync done: ${JSON.stringify(ani)}`);
    } catch (err) {
      this.logger.warn(
        `anilist-sync skipped/failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
