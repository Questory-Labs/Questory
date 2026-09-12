import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MusicTrendingController } from "./trending.controller";
import { MusicTrendingService } from "./trending.service";

@Module({
  imports: [AuthModule],
  controllers: [MusicTrendingController],
  providers: [MusicTrendingService],
})
export class MusicTrendingModule {}
