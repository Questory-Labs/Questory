import { Module, forwardRef } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { MigrationsService } from "./migrations/migrations.service";
import { ScraperAdminController } from "../scraper/scraper-admin.controller";
import { AuthModule } from "../auth/auth.module";
import { CronModule } from "../cron/cron.module";
import { SyncModule } from "../sync/sync.module";
import { CostModule } from "../cost/cost.module";
import { AccountsModule } from "../accounts/accounts.module";
import { SteamModule } from "../steam/steam.module";
import { WatchModule } from "../watch/watch.module";
import { ImportsModule } from "../watch/imports/imports.module";
import { ScraperModule } from "../scraper/scraper.module";

@Module({
  imports: [
    AuthModule,
    AccountsModule,
    SteamModule,
    CronModule,
    forwardRef(() => SyncModule),
    CostModule,
    forwardRef(() => WatchModule),
    ImportsModule,
    ScraperModule,
  ],
  controllers: [AdminController, ScraperAdminController],
  providers: [AdminService, MigrationsService],
  exports: [AdminService],
})
export class AdminModule {}
