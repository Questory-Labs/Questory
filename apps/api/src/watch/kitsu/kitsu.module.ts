import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { AuthModule } from "../auth/auth.module";
import { ReadCatalogModule } from "../../read/catalog/catalog.module";
import { KitsuController } from "./kitsu.controller";
import { KitsuService } from "./kitsu.service";

@Module({
  imports: [CatalogModule, EnrichmentModule, AuthModule, ReadCatalogModule],
  controllers: [KitsuController],
  providers: [KitsuService],
  exports: [KitsuService],
})
export class KitsuModule {}
