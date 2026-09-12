import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { CatalogModule as MusicCatalogModule } from "../music/catalog/catalog.module";
import { CatalogModule as WatchCatalogModule } from "../watch/catalog/catalog.module";
import { QmonitorModule } from "../qmonitor/qmonitor.module";
import { ReadCatalogModule } from "../read/catalog/catalog.module";
import { StoresModule } from "../stores/stores.module";
import { ProfileDataController } from "./profile-data.controller";
import { ProfileExportBuildService } from "./profile-export-build.service";
import { ProfileExportService } from "./profile-export.service";
import { ProfileImportGamesService } from "./profile-import-games.service";
import { ProfileImportMediaService } from "./profile-import-media.service";
import { ProfileImportService } from "./profile-import.service";

@Module({
  imports: [
    AccountsModule,
    StoresModule,
    QmonitorModule,
    MusicCatalogModule,
    WatchCatalogModule,
    ReadCatalogModule,
  ],
  controllers: [ProfileDataController],
  providers: [
    ProfileExportBuildService,
    ProfileExportService,
    ProfileImportGamesService,
    ProfileImportMediaService,
    ProfileImportService,
  ],
  exports: [ProfileExportService],
})
export class ProfileDataModule {}
