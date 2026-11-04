import { Module, forwardRef } from "@nestjs/common";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";
import { UserSyncController } from "./user-sync.controller";
import { UserSyncService } from "./user-sync.service";
import { SteamModule } from "../steam/steam.module";
import { CollectionsModule } from "../collections/collections.module";
import { StoresModule } from "../stores/stores.module";
import { AccountsModule } from "../accounts/accounts.module";

@Module({
  imports: [
    SteamModule,
    AccountsModule,
    forwardRef(() => CollectionsModule),
    forwardRef(() => StoresModule),
  ],
  providers: [SyncService, UserSyncService],
  controllers: [SyncController, UserSyncController],
  exports: [SyncService],
})
export class SyncModule {}
