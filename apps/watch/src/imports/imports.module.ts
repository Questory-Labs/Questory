import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { TmdbModule } from "../tmdb/tmdb.module";
import { AuthModule } from "../auth/auth.module";
import { ImportsController } from "./imports.controller";
import { LetterboxdService } from "./letterboxd.service";

@Module({
  imports: [CatalogModule, EnrichmentModule, TmdbModule, AuthModule],
  controllers: [ImportsController],
  providers: [LetterboxdService],
})
export class ImportsModule {}
