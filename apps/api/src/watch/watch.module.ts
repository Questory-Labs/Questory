import { Module } from "@nestjs/common";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AnilistModule } from "./anilist/anilist.module";
import { AnilistService } from "./anilist/anilist.service";
import { CatalogModule } from "./catalog/catalog.module";
import { EnrichmentModule } from "./enrichment/enrichment.module";
import { ImportsModule } from "./imports/imports.module";
import { InternalModule } from "./internal/internal.module";
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
      ): WatchCronSync => ({
        runTraktSync: () => trakt.syncHistory(),
        runAnilistSync: () => anilist.syncList(),
      }),
      inject: [TraktService, AnilistService],
    },
  ],
  exports: [WATCH_CRON_SYNC],
})
export class WatchModule {}
