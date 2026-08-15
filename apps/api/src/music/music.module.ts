import { Module } from "@nestjs/common";
import { UsersModule } from "./users/users.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CorrectionsModule } from "./corrections/corrections.module";
import { EnrichmentModule } from "./enrichment/enrichment.module";
import { ListenBrainzModule } from "./listenbrainz/listenbrainz.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ImportsModule } from "./imports/imports.module";
import { PlayingNowModule } from "./playing-now/playing-now.module";
import { ScrobblerModule } from "./scrobbler/scrobbler.module";

@Module({
  imports: [
    UsersModule,
    CatalogModule,
    CorrectionsModule,
    EnrichmentModule,
    PlayingNowModule,
    ListenBrainzModule,
    AnalyticsModule,
    ImportsModule,
    ScrobblerModule,
  ],
})
export class MusicModule {}
