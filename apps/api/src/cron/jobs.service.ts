import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { isCronEnabled } from "./cron-enabled";
import { CronRunnerService } from "./cron-runner.service";
import { getConfiguredSchedules } from "./cron-schedules";
import { InternalCronService } from "./internal-cron.service";
import { WATCH_CRON_SYNC, type WatchCronSync } from "./watch-cron.token";

export { WATCH_CRON_SYNC, type WatchCronSync } from "./watch-cron.token";

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly internalCron: InternalCronService,
    private readonly cronRunner: CronRunnerService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @Optional()
    @Inject(WATCH_CRON_SYNC)
    private readonly watchCron: WatchCronSync | null,
  ) {}

  onModuleInit() {
    if (!isCronEnabled()) {
      this.logger.log(
        "In-process cron disabled (CRON_ENABLED=false|FALSE|0)",
      );
      return;
    }

    const secret = (process.env.CRON_SECRET || "").trim();
    if (!secret) {
      this.logger.log(
        "CRON_SECRET unset — in-process scheduler starting; HTTP /v1/internal/cron/* stays locked",
      );
    }

    const schedules = getConfiguredSchedules();

    this.addJob("daily-refresh", schedules["daily-refresh"], () =>
      this.runDailyRefresh(),
    );
    this.addJob("recover-failed-sync", schedules["recover-failed-sync"], () =>
      this.runRecoverFailedSync(),
    );
    this.addJob("watch-sync", schedules["watch-sync"], () =>
      this.runWatchSync(),
    );
    this.addJob("catalog-sync", schedules["catalog-sync"], () =>
      this.runCatalogSync(),
    );

    this.logger.log(
      `Scheduled daily-refresh (${schedules["daily-refresh"]}), recover-failed-sync (${schedules["recover-failed-sync"]}), watch-sync (${schedules["watch-sync"]}), catalog-sync (${schedules["catalog-sync"]})`,
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
    const { result } = await this.cronRunner.run(
      "daily-refresh",
      "system",
      () => this.internalCron.dailyRefresh(),
    );
    this.logger.log(`daily-refresh done: ${JSON.stringify(result)}`);
  }

  async runRecoverFailedSync() {
    this.logger.log("Starting recover-failed-sync");
    const { result } = await this.cronRunner.run(
      "recover-failed-sync",
      "system",
      () => this.internalCron.recoverFailedSync(),
    );
    this.logger.log(`recover-failed-sync done: ${JSON.stringify(result)}`);
  }

  async runCatalogSync() {
    this.logger.log("Starting catalog-sync");
    const { result } = await this.cronRunner.run(
      "catalog-sync",
      "system",
      () => this.internalCron.syncCatalog({}),
    );
    this.logger.log(`catalog-sync done: ${JSON.stringify(result)}`);
  }

  async runWatchSync() {
    if (!this.watchCron) {
      this.logger.debug("watch-sync skipped (watch module not available)");
      return;
    }
    this.logger.log("Starting watch-sync (Trakt + AniList + anime providers)");
    const providerJobs: Array<{ name: string; run: () => Promise<unknown> }> = [
      { name: "trakt-sync", run: () => this.watchCron!.runTraktSync() },
      { name: "anilist-sync", run: () => this.watchCron!.runAnilistSync() },
      { name: "mal-sync", run: () => this.watchCron!.runMalSync() },
      { name: "kitsu-sync", run: () => this.watchCron!.runKitsuSync() },
      { name: "bangumi-sync", run: () => this.watchCron!.runBangumiSync() },
      { name: "shikimori-sync", run: () => this.watchCron!.runShikimoriSync() },
      {
        name: "letterboxd-scrape",
        run: () => this.watchCron!.runLetterboxdScrape(),
      },
    ];

    for (const job of providerJobs) {
      try {
        const { result } = await this.cronRunner.run(
          job.name,
          "system",
          job.run,
        );
        this.logger.log(`${job.name} done: ${JSON.stringify(result)}`);
      } catch (err) {
        this.logger.warn(
          `${job.name} skipped/failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
}
