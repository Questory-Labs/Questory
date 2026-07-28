import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { PlayingNowModule } from "../playing-now/playing-now.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { SessionUserGuard } from "../auth/session-user.guard";

@Module({
  imports: [UsersModule, PlayingNowModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, SessionUserGuard],
})
export class AnalyticsModule {}
