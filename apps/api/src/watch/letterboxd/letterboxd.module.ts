import { Module } from "@nestjs/common";
import { ScraperModule } from "../../scraper/scraper.module";
import { AuthModule } from "../auth/auth.module";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { ImportsModule } from "../imports/imports.module";
import { LetterboxdConnectController } from "./letterboxd-connect.controller";
import { LetterboxdConnectService } from "./letterboxd-connect.service";
import { LetterboxdScrapeSyncService } from "./letterboxd-scrape-sync.service";

@Module({
  imports: [
    AuthModule,
    CatalogModule,
    EnrichmentModule,
    ScraperModule,
    ImportsModule,
  ],
  controllers: [LetterboxdConnectController],
  providers: [LetterboxdConnectService, LetterboxdScrapeSyncService],
  exports: [LetterboxdConnectService, LetterboxdScrapeSyncService],
})
export class LetterboxdModule {}
