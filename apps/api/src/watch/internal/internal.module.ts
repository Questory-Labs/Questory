import { Module } from "@nestjs/common";
import { AnilistModule } from "../anilist/anilist.module";
import { TraktModule } from "../trakt/trakt.module";
import { InternalController } from "./internal.controller";

@Module({
  imports: [TraktModule, AnilistModule],
  controllers: [InternalController],
})
export class InternalModule {}
