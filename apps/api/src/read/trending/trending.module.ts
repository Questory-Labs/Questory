import { Module } from "@nestjs/common";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadTrendingController } from "./trending.controller";
import { ReadTrendingService } from "./trending.service";

@Module({
  imports: [ReadAuthModule],
  controllers: [ReadTrendingController],
  providers: [ReadTrendingService],
})
export class ReadTrendingModule {}
