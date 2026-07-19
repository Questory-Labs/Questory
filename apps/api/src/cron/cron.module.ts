import { Module } from "@nestjs/common";
import { SyncModule } from "../sync/sync.module";
import { SteamModule } from "../steam/steam.module";
import { CronSecretGuard } from "./cron-secret.guard";
import { InternalCronController } from "./internal-cron.controller";
import { InternalCronService } from "./internal-cron.service";

@Module({
  imports: [SyncModule, SteamModule],
  controllers: [InternalCronController],
  providers: [InternalCronService, CronSecretGuard],
})
export class CronModule {}
