import { Module } from "@nestjs/common";
import { SyncModule } from "../sync/sync.module";
import { ImportsModule as MusicImportsModule } from "../music/imports/imports.module";
import { ImportsModule as WatchImportsModule } from "../watch/imports/imports.module";
import { TraktModule } from "../watch/trakt/trakt.module";
import { AnilistModule } from "../watch/anilist/anilist.module";
import { MalModule } from "../watch/mal/mal.module";
import { KitsuModule } from "../watch/kitsu/kitsu.module";
import { BangumiModule } from "../watch/bangumi/bangumi.module";
import { ShikimoriModule } from "../watch/shikimori/shikimori.module";
import { ShellSyncStatusController } from "./shell-sync-status.controller";
import { ShellSyncStatusService } from "./shell-sync-status.service";
import { ShellNavCountsController } from "./shell-nav-counts.controller";
import { ShellNavCountsService } from "./shell-nav-counts.service";

@Module({
  imports: [
    SyncModule,
    MusicImportsModule,
    WatchImportsModule,
    TraktModule,
    AnilistModule,
    MalModule,
    KitsuModule,
    BangumiModule,
    ShikimoriModule,
  ],
  controllers: [ShellSyncStatusController, ShellNavCountsController],
  providers: [ShellSyncStatusService, ShellNavCountsService],
})
export class ShellModule {}
