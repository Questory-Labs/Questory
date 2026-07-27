import { Module } from "@nestjs/common";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadAnalyticsController } from "./analytics.controller";
import { ReadAnalyticsService } from "./analytics.service";

@Module({
  imports: [ReadAuthModule],
  controllers: [ReadAnalyticsController],
  providers: [ReadAnalyticsService],
  exports: [ReadAnalyticsService],
})
export class ReadAnalyticsModule {}
