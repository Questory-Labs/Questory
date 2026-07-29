import { Module, forwardRef } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { CorrectionsModule } from "../corrections/corrections.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { PlayingNowService } from "./playing-now.service";

@Module({
  imports: [
    CatalogModule,
    EnrichmentModule,
    forwardRef(() => CorrectionsModule),
  ],
  providers: [PlayingNowService],
  exports: [PlayingNowService],
})
export class PlayingNowModule {}
