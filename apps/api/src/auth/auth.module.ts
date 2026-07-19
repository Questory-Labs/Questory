import { Module, forwardRef } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SteamModule } from "../steam/steam.module";
import { SyncModule } from "../sync/sync.module";
import { AccountsModule } from "../accounts/accounts.module";

@Module({
  imports: [SteamModule, AccountsModule, forwardRef(() => SyncModule)],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
