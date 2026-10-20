import { Module } from "@nestjs/common";
import { GamesController } from "./games.controller";
import { GamesService } from "./games.service";
import { SteamModule } from "../steam/steam.module";
import { AccountsModule } from "../accounts/accounts.module";
import { RewindModule } from "../rewind/rewind.module";
import { GamesRewindController } from "./rewind/games-rewind.controller";
import { GamesRewindService } from "./rewind/games-rewind.service";

@Module({
  imports: [SteamModule, AccountsModule, RewindModule],
  controllers: [GamesRewindController, GamesController],
  providers: [GamesService, GamesRewindService],
  exports: [GamesService, GamesRewindService],
})
export class GamesModule {}
