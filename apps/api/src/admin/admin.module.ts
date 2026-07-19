import { Module, forwardRef } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuthModule } from "../auth/auth.module";
import { CronModule } from "../cron/cron.module";
import { SyncModule } from "../sync/sync.module";
import { CostModule } from "../cost/cost.module";
import { AccountsModule } from "../accounts/accounts.module";
import { SteamModule } from "../steam/steam.module";

@Module({
  imports: [
    AuthModule,
    AccountsModule,
    SteamModule,
    CronModule,
    forwardRef(() => SyncModule),
    CostModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
