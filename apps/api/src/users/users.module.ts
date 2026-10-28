import { Module, forwardRef } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { SyncModule } from "../sync/sync.module";
import { AuthModule } from "../auth/auth.module";
import { EnterpriseModule } from "../enterprise/enterprise.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { ConnectionsController } from "./connections.controller";
import { ConnectionsService } from "./connections.service";

@Module({
  imports: [
    AccountsModule,
    AuthModule,
    EnterpriseModule,
    forwardRef(() => SyncModule),
  ],
  controllers: [UsersController, ConnectionsController],
  providers: [UsersService, ConnectionsService],
  exports: [UsersService],
})
export class UsersModule {}
