import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { CorrectionsModule } from "../corrections/corrections.module";
import { PlayingNowModule } from "../playing-now/playing-now.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { HeatmapService } from "./heatmap.service";
import { SessionUserGuard } from "../auth/session-user.guard";
import { MusicRewindController } from "./rewind.controller";
import { RewindModule } from "../../rewind/rewind.module";

@Module({
  imports: [UsersModule, PlayingNowModule, CorrectionsModule, RewindModule],
  controllers: [AnalyticsController, MusicRewindController],
  providers: [AnalyticsService, HeatmapService, SessionUserGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
