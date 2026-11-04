import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CacheModule } from "../cache/cache.module";
import { CollectionsModule } from "../collections/collections.module";
import { PrismaModule } from "../prisma/prisma.module";
import { EnterpriseAdminController } from "./enterprise-admin.controller";
import { EnterpriseAiGoalsController } from "./enterprise-ai-goals.controller";
import { EnterpriseAiGoalsService } from "./enterprise-ai-goals.service";
import { EnterpriseClustersController } from "./enterprise-clusters.controller";
import { EnterpriseProxyService } from "./enterprise-proxy.service";
import { EnterpriseRateLimitService } from "./enterprise-rate-limit.service";
import { EnterpriseRecommendationsController } from "./enterprise-recommendations.controller";
import { EnterpriseSettingsController } from "./enterprise-settings.controller";
import { EnterpriseStatusController } from "./enterprise-status.controller";

@Module({
  imports: [AuthModule, CacheModule, CollectionsModule, PrismaModule],
  controllers: [
    EnterpriseAiGoalsController,
    EnterpriseRecommendationsController,
    EnterpriseSettingsController,
    EnterpriseAdminController,
    EnterpriseStatusController,
    EnterpriseClustersController,
  ],
  providers: [
    EnterpriseProxyService,
    EnterpriseRateLimitService,
    EnterpriseAiGoalsService,
  ],
  exports: [EnterpriseProxyService, EnterpriseAiGoalsService],
})
export class EnterpriseModule {}
