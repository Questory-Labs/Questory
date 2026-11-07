import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { CronModule } from "../cron/cron.module";
import { CronRunnerService } from "../cron/cron-runner.service";
import { isCronEnabled } from "../cron/cron-enabled";
import { RewindModule } from "../rewind/rewind.module";
import { RewindShareController } from "../rewind/rewind-share.controller";
import { RewindSharePublicController } from "../rewind/rewind-share-public.controller";
import { RewindShareService } from "../rewind/rewind-share.service";
import { AuthModule } from "../auth/auth.module";
import { AnalyticsModule as MusicAnalyticsModule } from "../music/analytics/analytics.module";
import { AnalyticsModule as WatchAnalyticsModule } from "../watch/analytics/analytics.module";
import { ReadAnalyticsModule } from "../read/analytics/analytics.module";
import { GamesModule } from "../games/games.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MonthlyRecapService } from "./monthly-recap.service";
import { DEFAULT_RECAP_SCHEDULE } from "./recap.constants";
import { RecapController } from "./recap.controller";
import { UnifiedRewindController } from "./unified-rewind.controller";

export { DEFAULT_RECAP_SCHEDULE };

@Module({
  imports: [
    CronModule,
    AuthModule,
    RewindModule,
    MusicAnalyticsModule,
    WatchAnalyticsModule,
    ReadAnalyticsModule,
    GamesModule,
    NotificationsModule,
  ],
  controllers: [RecapController, UnifiedRewindController, RewindShareController, RewindSharePublicController],
  providers: [MonthlyRecapService, RewindShareService],
  exports: [MonthlyRecapService],
})
export class RecapModule implements OnModuleInit {
  private readonly logger = new Logger(RecapModule.name);

  constructor(
    private readonly recap: MonthlyRecapService,
    private readonly cronRunner: CronRunnerService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    if (!isCronEnabled()) return;
    const schedule = process.env.CRON_RECAP_SCHEDULE || DEFAULT_RECAP_SCHEDULE;
    const job = new CronJob(schedule, () => {
      void this.cronRunner
        .run("monthly-recap", "system", () => this.recap.run())
        .then(({ result }) => this.logger.log(`monthly-recap done: ${JSON.stringify(result)}`))
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`monthly-recap failed: ${message}`);
        });
    });
    this.schedulerRegistry.addCronJob("monthly-recap", job);
    job.start();
    this.logger.log(`Scheduled monthly-recap (${schedule})`);
  }
}
