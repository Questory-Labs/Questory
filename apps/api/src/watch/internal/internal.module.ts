import { Module } from "@nestjs/common";
import { AnilistModule } from "../anilist/anilist.module";
import { BangumiModule } from "../bangumi/bangumi.module";
import { KitsuModule } from "../kitsu/kitsu.module";
import { MalModule } from "../mal/mal.module";
import { ShikimoriModule } from "../shikimori/shikimori.module";
import { TraktModule } from "../trakt/trakt.module";
import { InternalController } from "./internal.controller";

@Module({
  imports: [
    TraktModule,
    AnilistModule,
    MalModule,
    KitsuModule,
    BangumiModule,
    ShikimoriModule,
  ],
  controllers: [InternalController],
})
export class InternalModule {}
