import { Module } from "@nestjs/common";
import { ReadCatalogService } from "./catalog.service";

@Module({
  providers: [ReadCatalogService],
  exports: [ReadCatalogService],
})
export class ReadCatalogModule {}
