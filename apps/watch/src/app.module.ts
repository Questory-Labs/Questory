import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AnilistModule } from "./anilist/anilist.module";
import { CatalogModule } from "./catalog/catalog.module";
import { EnrichmentModule } from "./enrichment/enrichment.module";
import { HealthController } from "./health.controller";
import { ImportsModule } from "./imports/imports.module";
import { InternalModule } from "./internal/internal.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TmdbModule } from "./tmdb/tmdb.module";
import { TraktModule } from "./trakt/trakt.module";
import { UsersModule } from "./users/users.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
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
  controllers: [HealthController],
})
export class AppModule {}
