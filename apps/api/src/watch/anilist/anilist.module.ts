import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { AuthModule } from "../auth/auth.module";
import { AnilistController } from "./anilist.controller";
import { AnilistService } from "./anilist.service";

@Module({
  imports: [CatalogModule, EnrichmentModule, AuthModule],
  controllers: [AnilistController],
  providers: [AnilistService],
  exports: [AnilistService],
})
export class AnilistModule {}
