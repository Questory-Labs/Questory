import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { PlayingNowService } from "./playing-now.service";

@Module({
  imports: [CatalogModule, EnrichmentModule],
  providers: [PlayingNowService],
  exports: [PlayingNowService],
})
export class PlayingNowModule {}
