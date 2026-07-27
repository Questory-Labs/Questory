import { Module, forwardRef } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthAbuseService } from "./abuse/auth-abuse.service";
import { AdminGuard } from "./admin.guard";
import { SteamModule } from "../steam/steam.module";
import { SyncModule } from "../sync/sync.module";
import { AccountsModule } from "../accounts/accounts.module";
import { CacheModule } from "../cache/cache.module";

@Module({
  imports: [
    SteamModule,
    AccountsModule,
    CacheModule,
    forwardRef(() => SyncModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthAbuseService, AdminGuard],
  exports: [AuthService, AuthAbuseService, AdminGuard],
})
export class AuthModule {}
