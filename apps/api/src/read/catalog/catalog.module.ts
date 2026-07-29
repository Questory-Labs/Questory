import { Module } from "@nestjs/common";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadCatalogController } from "./catalog.controller";
import { ReadCatalogService } from "./catalog.service";

@Module({
  imports: [ReadAuthModule],
  controllers: [ReadCatalogController],
  providers: [ReadCatalogService],
  exports: [ReadCatalogService],
})
export class ReadCatalogModule {}
