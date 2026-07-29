import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { AuthModule } from "../auth/auth.module";
import { ReadCatalogModule } from "../../read/catalog/catalog.module";
import { MalController } from "./mal.controller";
import { MalService } from "./mal.service";

@Module({
  imports: [CatalogModule, EnrichmentModule, AuthModule, ReadCatalogModule],
  controllers: [MalController],
  providers: [MalService],
  exports: [MalService],
})
export class MalModule {}
