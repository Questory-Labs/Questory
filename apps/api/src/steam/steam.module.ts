import { Module } from "@nestjs/common";
import { SteamApiService } from "./steam-api.service";
import { ItadService } from "./itad.service";
import { HltbService } from "./hltb.service";
import { IgdbService } from "./igdb.service";
import { PlayerCountService } from "./player-count.service";
import { ConcurrentPlayersService } from "./concurrent-players.service";
import { CatalogService } from "./catalog.service";

@Module({
  providers: [
    SteamApiService,
    ItadService,
    HltbService,
    IgdbService,
    PlayerCountService,
    ConcurrentPlayersService,
    CatalogService,
  ],
  exports: [
    SteamApiService,
    ItadService,
    HltbService,
    IgdbService,
    PlayerCountService,
    ConcurrentPlayersService,
    CatalogService,
  ],
})
export class SteamModule {}
