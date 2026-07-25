import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { TmdbModule } from "../tmdb/tmdb.module";
import { EnrichmentService } from "./enrichment.service";

@Module({
  imports: [CatalogModule, TmdbModule],
  providers: [EnrichmentService],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
