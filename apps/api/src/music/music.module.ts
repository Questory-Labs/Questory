import { Module } from "@nestjs/common";
import { UsersModule } from "./users/users.module";
import { CatalogModule } from "./catalog/catalog.module";
import { EnrichmentModule } from "./enrichment/enrichment.module";
import { ListenBrainzModule } from "./listenbrainz/listenbrainz.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ImportsModule } from "./imports/imports.module";

@Module({
  imports: [
    UsersModule,
    CatalogModule,
    EnrichmentModule,
    ListenBrainzModule,
    AnalyticsModule,
    ImportsModule,
  ],
})
export class MusicModule {}
