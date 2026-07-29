import { Module } from "@nestjs/common";
import { KitsuModule as WatchKitsuModule } from "../../watch/kitsu/kitsu.module";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadKitsuController } from "./kitsu.controller";

@Module({
  imports: [WatchKitsuModule, ReadAuthModule],
  controllers: [ReadKitsuController],
})
export class ReadKitsuModule {}
