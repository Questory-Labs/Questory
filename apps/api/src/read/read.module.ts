import { Module } from "@nestjs/common";
import { AnilistModule as WatchAnilistModule } from "../watch/anilist/anilist.module";
import { ReadAnalyticsModule } from "./analytics/analytics.module";
import { ReadAnilistModule } from "./anilist/anilist.module";
import { ReadAuthModule } from "./auth/auth.module";
import { ReadCatalogModule } from "./catalog/catalog.module";
import { ReadLibraryModule } from "./library/library.module";
import { ReadSyncStatusController } from "./sync-status.controller";

@Module({
  imports: [
    ReadAuthModule,
    ReadCatalogModule,
    ReadAnalyticsModule,
    ReadLibraryModule,
    ReadAnilistModule,
    WatchAnilistModule,
  ],
  controllers: [ReadSyncStatusController],
})
export class ReadModule {}
