import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { AuthModule } from "../auth/auth.module";
import { ReadCatalogModule } from "../../read/catalog/catalog.module";
import { BangumiController } from "./bangumi.controller";
import { BangumiService } from "./bangumi.service";

@Module({
  imports: [CatalogModule, EnrichmentModule, AuthModule, ReadCatalogModule],
  controllers: [BangumiController],
  providers: [BangumiService],
  exports: [BangumiService],
})
export class BangumiModule {}
