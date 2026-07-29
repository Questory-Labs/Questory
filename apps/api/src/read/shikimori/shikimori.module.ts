import { Module } from "@nestjs/common";
import { ShikimoriModule as WatchShikimoriModule } from "../../watch/shikimori/shikimori.module";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadShikimoriController } from "./shikimori.controller";

@Module({
  imports: [WatchShikimoriModule, ReadAuthModule],
  controllers: [ReadShikimoriController],
})
export class ReadShikimoriModule {}
