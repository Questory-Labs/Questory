import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { RewindController } from "./rewind.controller";

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController, RewindController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
