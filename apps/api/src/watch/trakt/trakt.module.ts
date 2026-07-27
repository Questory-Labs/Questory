import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { AuthModule } from "../auth/auth.module";
import { TraktController } from "./trakt.controller";
import { TraktService } from "./trakt.service";

@Module({
  imports: [CatalogModule, EnrichmentModule, AuthModule],
  controllers: [TraktController],
  providers: [TraktService],
  exports: [TraktService],
})
export class TraktModule {}
