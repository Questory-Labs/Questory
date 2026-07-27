import { Module } from "@nestjs/common";
import { AnilistModule as WatchAnilistModule } from "../../watch/anilist/anilist.module";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadAnilistController } from "./anilist.controller";

@Module({
  imports: [WatchAnilistModule, ReadAuthModule],
  controllers: [ReadAnilistController],
})
export class ReadAnilistModule {}
