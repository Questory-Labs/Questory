import { Module } from "@nestjs/common";
import { SyncModule } from "../sync/sync.module";
import { CronSecretGuard } from "./cron-secret.guard";
import { InternalCronController } from "./internal-cron.controller";
import { InternalCronService } from "./internal-cron.service";

@Module({
  imports: [SyncModule],
  controllers: [InternalCronController],
  providers: [InternalCronService, CronSecretGuard],
})
export class CronModule {}
