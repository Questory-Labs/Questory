import { Module } from "@nestjs/common";
import { ApiKeyGuard } from "../auth/api-key.guard";
import { LibraryModule } from "../library/library.module";
import { UsersModule } from "../users/users.module";
import { WishlistModule } from "../wishlist/wishlist.module";
import { RecapModule } from "../recap/recap.module";
import { GamesModule } from "../games/games.module";
import { QmonitorModule } from "../qmonitor/qmonitor.module";
import { PlayingNowModule } from "../music/playing-now/playing-now.module";
import { AnalyticsModule as MusicAnalyticsModule } from "../music/analytics/analytics.module";
import { AnalyticsModule as WatchAnalyticsModule } from "../watch/analytics/analytics.module";
import { ReadAnalyticsModule } from "../read/analytics/analytics.module";
import { PublicApiController } from "./public-api.controller";
import { PublicApiDocsController } from "./public-api-docs.controller";
import { PublicApiService } from "./public-api.service";

@Module({
  imports: [
    LibraryModule,
    UsersModule,
    WishlistModule,
    RecapModule,
    GamesModule,
    QmonitorModule,
    PlayingNowModule,
    MusicAnalyticsModule,
    WatchAnalyticsModule,
    ReadAnalyticsModule,
  ],
  controllers: [PublicApiDocsController, PublicApiController],
  providers: [PublicApiService, ApiKeyGuard],
})
export class PublicApiModule {}
