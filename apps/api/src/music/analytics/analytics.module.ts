import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { SessionUserGuard } from "../auth/session-user.guard";

@Module({
  imports: [UsersModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, SessionUserGuard],
})
export class AnalyticsModule {}
