import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TmdbModule } from "../tmdb/tmdb.module";
import { WatchTrendingController } from "./trending.controller";
import { WatchTrendingService } from "./trending.service";

@Module({
  imports: [AuthModule, TmdbModule],
  controllers: [WatchTrendingController],
  providers: [WatchTrendingService],
})
export class WatchTrendingModule {}
