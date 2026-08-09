import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";
import { PrismaModule } from "./prisma/prisma.module";
import { CacheModule } from "./cache/cache.module";
import { SteamModule } from "./steam/steam.module";
import { AuthModule } from "./auth/auth.module";
import { SyncModule } from "./sync/sync.module";
import { UsersModule } from "./users/users.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { LibraryModule } from "./library/library.module";
import { SearchModule } from "./search/search.module";
import { WishlistModule } from "./wishlist/wishlist.module";
import { CostModule } from "./cost/cost.module";
import { FriendsModule } from "./friends/friends.module";
import { MultiplayerModule } from "./multiplayer/multiplayer.module";
import { FamilyModule } from "./family/family.module";
import { GamesModule } from "./games/games.module";
import { CollectionsModule } from "./collections/collections.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { StoresModule } from "./stores/stores.module";
import { TrendingModule } from "./trending/trending.module";
import { CronModule } from "./cron/cron.module";
import { AdminModule } from "./admin/admin.module";
import { AccountsModule } from "./accounts/accounts.module";
import { ApiKeysModule } from "./api-keys/api-keys.module";
import { MusicModule } from "./music/music.module";
import { WatchModule } from "./watch/watch.module";
import { ReadModule } from "./read/read.module";
import { ShellModule } from "./shell/shell.module";
import { HealthController } from "./health.controller";
import { EnterpriseModule } from "./enterprise/enterprise.module";
import { TagsModule } from "./tags/tags.module";

const rootEnv = resolve(process.cwd(), "../../.env");
const localEnv = resolve(process.cwd(), ".env");

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Root first; do not let empty local values clobber root secrets.
      envFilePath: [rootEnv, localEnv],
      expandVariables: true,
    }),
    PrismaModule,
    CacheModule,
    SteamModule,
    AccountsModule,
    ApiKeysModule,
    AuthModule,
    SyncModule,
    UsersModule,
    DashboardModule,
    LibraryModule,
    SearchModule,
    WishlistModule,
    CostModule,
    FriendsModule,
    MultiplayerModule,
    FamilyModule,
    GamesModule,
    CollectionsModule,
    NotificationsModule,
    StoresModule,
    TrendingModule,
    MusicModule,
    WatchModule,
    ReadModule,
    ShellModule,
    CronModule,
    AdminModule,
    EnterpriseModule,
    TagsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
