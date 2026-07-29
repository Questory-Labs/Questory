import { Module } from "@nestjs/common";
import { BangumiModule as WatchBangumiModule } from "../../watch/bangumi/bangumi.module";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadBangumiController } from "./bangumi.controller";

@Module({
  imports: [WatchBangumiModule, ReadAuthModule],
  controllers: [ReadBangumiController],
})
export class ReadBangumiModule {}
