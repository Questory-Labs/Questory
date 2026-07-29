import { Module } from "@nestjs/common";
import { SteamModule } from "../steam/steam.module";
import { GameMergeService } from "./game-merge.service";
import { StoresService } from "./stores.service";
import { StoresController } from "./stores.controller";

@Module({
  imports: [SteamModule],
  providers: [GameMergeService, StoresService],
  controllers: [StoresController],
  exports: [GameMergeService, StoresService],
})
export class StoresModule {}
