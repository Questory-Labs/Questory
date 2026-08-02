import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CacheModule } from "../cache/cache.module";
import { PrismaModule } from "../prisma/prisma.module";
import { EnterpriseAdminController } from "./enterprise-admin.controller";
import { EnterpriseProxyService } from "./enterprise-proxy.service";
import { EnterpriseRateLimitService } from "./enterprise-rate-limit.service";
import { EnterpriseRecommendationsController } from "./enterprise-recommendations.controller";
import { EnterpriseSettingsController } from "./enterprise-settings.controller";
import { EnterpriseStatusController } from "./enterprise-status.controller";

@Module({
  imports: [AuthModule, CacheModule, PrismaModule],
  controllers: [
    EnterpriseRecommendationsController,
    EnterpriseSettingsController,
    EnterpriseAdminController,
    EnterpriseStatusController,
  ],
  providers: [EnterpriseProxyService, EnterpriseRateLimitService],
  exports: [EnterpriseProxyService],
})
export class EnterpriseModule {}
