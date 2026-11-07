import { Module, forwardRef } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { EnterpriseModule } from "../enterprise/enterprise.module";
import { SyncModule } from "../sync/sync.module";
import { SteamModule } from "../steam/steam.module";
import { WatchModule } from "../watch/watch.module";
import { ProfileDataModule } from "../profile-data/profile-data.module";
import { CronSecretGuard } from "./cron-secret.guard";
import { CronRunnerService } from "./cron-runner.service";
import { InternalCronController } from "./internal-cron.controller";
import { InternalCronService } from "./internal-cron.service";
import { JobsService } from "./jobs.service";
import { HltbBackfillService } from "./hltb-backfill.service";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SyncModule,
    SteamModule,
    forwardRef(() => WatchModule),
    ProfileDataModule,
    EnterpriseModule,
  ],
  controllers: [InternalCronController],
  providers: [
    InternalCronService,
    CronRunnerService,
    CronSecretGuard,
    JobsService,
    HltbBackfillService,
  ],
  exports: [InternalCronService, CronRunnerService, JobsService],
})
export class CronModule {}
