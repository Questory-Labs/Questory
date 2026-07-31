import { Module } from "@nestjs/common";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AnilistModule } from "./anilist/anilist.module";
import { AnilistService } from "./anilist/anilist.service";
import { BangumiModule } from "./bangumi/bangumi.module";
import { BangumiService } from "./bangumi/bangumi.service";
import { CatalogModule } from "./catalog/catalog.module";
import { EnrichmentModule } from "./enrichment/enrichment.module";
import { ImportsModule } from "./imports/imports.module";
import { InternalModule } from "./internal/internal.module";
import { LetterboxdModule } from "./letterboxd/letterboxd.module";
import { LetterboxdScrapeSyncService } from "./letterboxd/letterboxd-scrape-sync.service";
import { KitsuModule } from "./kitsu/kitsu.module";
import { KitsuService } from "./kitsu/kitsu.service";
import { MalModule } from "./mal/mal.module";
import { MalService } from "./mal/mal.service";
import { ShikimoriModule } from "./shikimori/shikimori.module";
import { ShikimoriService } from "./shikimori/shikimori.service";
import { TmdbModule } from "./tmdb/tmdb.module";
import { TraktModule } from "./trakt/trakt.module";
import { TraktService } from "./trakt/trakt.service";
import { UsersModule } from "./users/users.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { WATCH_CRON_SYNC, type WatchCronSync } from "../cron/watch-cron.token";

@Module({
  imports: [
    UsersModule,
    CatalogModule,
    TmdbModule,
    EnrichmentModule,
    TraktModule,
    AnilistModule,
    MalModule,
    KitsuModule,
    BangumiModule,
    ShikimoriModule,
    LetterboxdModule,
    ImportsModule,
    WebhooksModule,
    AnalyticsModule,
    InternalModule,
  ],
  providers: [
    {
      provide: WATCH_CRON_SYNC,
      useFactory: (
        trakt: TraktService,
        anilist: AnilistService,
        mal: MalService,
        kitsu: KitsuService,
        bangumi: BangumiService,
        shikimori: ShikimoriService,
        letterboxd: LetterboxdScrapeSyncService,
      ): WatchCronSync => ({
        runTraktSync: () => trakt.syncHistory(),
        runAnilistSync: () => anilist.syncList(),
        runMalSync: () => mal.syncList(),
        runKitsuSync: () => kitsu.syncList(),
        runBangumiSync: () => bangumi.syncList(),
        runShikimoriSync: () => shikimori.syncList(),
        runLetterboxdScrape: () => letterboxd.syncAll(),
      }),
      inject: [
        TraktService,
        AnilistService,
        MalService,
        KitsuService,
        BangumiService,
        ShikimoriService,
        LetterboxdScrapeSyncService,
      ],
    },
  ],
  exports: [WATCH_CRON_SYNC],
})
export class WatchModule {}
