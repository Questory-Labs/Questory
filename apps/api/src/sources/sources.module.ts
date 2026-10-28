import { Module } from "@nestjs/common";
import { AuthModule as WatchAuthModule } from "../watch/auth/auth.module";
import { SourcesController } from "./sources.controller";
import { SourcesService } from "./sources.service";

@Module({
  imports: [WatchAuthModule],
  controllers: [SourcesController],
  providers: [SourcesService],
})
export class SourcesModule {}
