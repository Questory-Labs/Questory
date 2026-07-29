import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { AuthModule } from "../auth/auth.module";
import { ReadCatalogModule } from "../../read/catalog/catalog.module";
import { ShikimoriController } from "./shikimori.controller";
import { ShikimoriService } from "./shikimori.service";

@Module({
  imports: [CatalogModule, EnrichmentModule, AuthModule, ReadCatalogModule],
  controllers: [ShikimoriController],
  providers: [ShikimoriService],
  exports: [ShikimoriService],
})
export class ShikimoriModule {}
