import { Module, forwardRef } from "@nestjs/common";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";
import { SteamModule } from "../steam/steam.module";
import { CollectionsModule } from "../collections/collections.module";
import { StoresModule } from "../stores/stores.module";

@Module({
  imports: [
    SteamModule,
    forwardRef(() => CollectionsModule),
    forwardRef(() => StoresModule),
  ],
  providers: [SyncService],
  controllers: [SyncController],
  exports: [SyncService],
})
export class SyncModule {}
