import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ScraperAdminController } from "./scraper-admin.controller";
import { ScraperEngineService } from "./scraper-engine.service";
import { ScraperProvidersService } from "./scraper-providers.service";

@Module({
  imports: [AuthModule],
  controllers: [ScraperAdminController],
  providers: [ScraperEngineService, ScraperProvidersService],
  exports: [ScraperEngineService, ScraperProvidersService],
})
export class ScraperModule {}
