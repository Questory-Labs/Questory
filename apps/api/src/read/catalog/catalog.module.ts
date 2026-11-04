import { Module } from "@nestjs/common";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadCatalogController } from "./catalog.controller";
import { ReadCatalogService } from "./catalog.service";
import { ReadProgressController } from "./progress.controller";
import { ReadProgressService } from "./progress.service";

@Module({
  imports: [ReadAuthModule],
  controllers: [ReadCatalogController, ReadProgressController],
  providers: [ReadCatalogService, ReadProgressService],
  exports: [ReadCatalogService],
})
export class ReadCatalogModule {}
