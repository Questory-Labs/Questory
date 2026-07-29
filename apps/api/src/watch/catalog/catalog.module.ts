import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WatchCatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [AuthModule],
  controllers: [WatchCatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
