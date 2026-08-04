import { Module, forwardRef } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SyncModule } from "../sync/sync.module";
import { SteamModule } from "../steam/steam.module";
import { WatchModule } from "../watch/watch.module";
import { CronSecretGuard } from "./cron-secret.guard";
import { CronRunnerService } from "./cron-runner.service";
import { InternalCronController } from "./internal-cron.controller";
import { InternalCronService } from "./internal-cron.service";
import { JobsService } from "./jobs.service";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SyncModule,
    SteamModule,
    forwardRef(() => WatchModule),
  ],
  controllers: [InternalCronController],
  providers: [
    InternalCronService,
    CronRunnerService,
    CronSecretGuard,
    JobsService,
  ],
  exports: [InternalCronService, CronRunnerService, JobsService],
})
export class CronModule {}
