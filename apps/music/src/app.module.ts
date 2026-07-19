import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { CatalogModule } from "./catalog/catalog.module";
import { EnrichmentModule } from "./enrichment/enrichment.module";
import { ListenBrainzModule } from "./listenbrainz/listenbrainz.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ImportsModule } from "./imports/imports.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    CatalogModule,
    EnrichmentModule,
    ListenBrainzModule,
    AnalyticsModule,
    ImportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

