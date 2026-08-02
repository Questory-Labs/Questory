import { Module } from "@nestjs/common";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadAnalyticsController } from "./analytics.controller";
import { ReadAnalyticsService } from "./analytics.service";
import { RewindController } from "./rewind.controller";

@Module({
  imports: [ReadAuthModule],
  controllers: [ReadAnalyticsController, RewindController],
  providers: [ReadAnalyticsService],
  exports: [ReadAnalyticsService],
})
export class ReadAnalyticsModule {}
