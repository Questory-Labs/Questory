import { Module, forwardRef } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminUserOpsService } from "./admin-user-ops.service";
import { MigrationsService } from "./migrations/migrations.service";
import { EnrichmentModule as MusicEnrichmentModule } from "../music/enrichment/enrichment.module";
import { AnilistModule } from "../watch/anilist/anilist.module";
import { BangumiModule } from "../watch/bangumi/bangumi.module";
import { KitsuModule } from "../watch/kitsu/kitsu.module";
import { LetterboxdModule } from "../watch/letterboxd/letterboxd.module";
import { MalModule } from "../watch/mal/mal.module";
import { ShikimoriModule } from "../watch/shikimori/shikimori.module";
import { TraktModule } from "../watch/trakt/trakt.module";
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
    MusicEnrichmentModule,
    TraktModule,
    AnilistModule,
    MalModule,
    KitsuModule,
    BangumiModule,
    ShikimoriModule,
    LetterboxdModule,
  ],
  controllers: [AdminController, ScraperAdminController],
  providers: [AdminService, AdminUserOpsService, MigrationsService],
  exports: [AdminService],
})
export class AdminModule {}
