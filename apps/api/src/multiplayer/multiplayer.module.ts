import { Module } from "@nestjs/common";
import { MultiplayerController } from "./multiplayer.controller";
import { MultiplayerService } from "./multiplayer.service";
import { SteamModule } from "../steam/steam.module";

@Module({
  imports: [SteamModule],
  controllers: [MultiplayerController],
  providers: [MultiplayerService],
})
export class MultiplayerModule {}
