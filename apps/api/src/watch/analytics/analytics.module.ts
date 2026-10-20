import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { WatchRewindController } from "./rewind.controller";
import { RewindModule } from "../../rewind/rewind.module";

@Module({
  imports: [AuthModule, RewindModule],
  controllers: [AnalyticsController, WatchRewindController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
