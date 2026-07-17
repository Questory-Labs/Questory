import { Module } from "@nestjs/common";
import { TrendingController } from "./trending.controller";
import { TrendingService } from "./trending.service";
import { SteamModule } from "../steam/steam.module";

@Module({
  imports: [SteamModule],
  controllers: [TrendingController],
  providers: [TrendingService],
})
export class TrendingModule {}
