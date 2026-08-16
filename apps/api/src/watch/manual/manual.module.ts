import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { TmdbModule } from "../tmdb/tmdb.module";
import { AnilistSearch } from "./anilist-search";
import { WatchManualController } from "./manual.controller";
import { ManualService } from "./manual.service";

@Module({
  imports: [AuthModule, CatalogModule, TmdbModule, EnrichmentModule],
  controllers: [WatchManualController],
  providers: [ManualService, AnilistSearch],
})
export class ManualModule {}
