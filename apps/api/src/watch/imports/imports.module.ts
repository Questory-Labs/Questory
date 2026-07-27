import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { TmdbModule } from "../tmdb/tmdb.module";
import { AuthModule } from "../auth/auth.module";
import { TraktModule } from "../trakt/trakt.module";
import { AnilistModule } from "../anilist/anilist.module";
import { ImportsController } from "./imports.controller";
import { WatchStatusController } from "./watch-status.controller";
import { LetterboxdService } from "./letterboxd.service";

@Module({
  imports: [
    CatalogModule,
    EnrichmentModule,
    TmdbModule,
    AuthModule,
    TraktModule,
    AnilistModule,
  ],
  controllers: [ImportsController, WatchStatusController],
  providers: [LetterboxdService],
  exports: [LetterboxdService],
})
export class ImportsModule {}
