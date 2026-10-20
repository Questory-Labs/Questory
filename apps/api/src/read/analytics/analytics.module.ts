import { Module } from "@nestjs/common";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadAnalyticsController } from "./analytics.controller";
import { ReadAnalyticsService } from "./analytics.service";
import { ReadRewindController } from "./rewind.controller";
import { RewindModule } from "../../rewind/rewind.module";

@Module({
  imports: [ReadAuthModule, RewindModule],
  controllers: [ReadAnalyticsController, ReadRewindController],
  providers: [ReadAnalyticsService],
  exports: [ReadAnalyticsService],
})
export class ReadAnalyticsModule {}
