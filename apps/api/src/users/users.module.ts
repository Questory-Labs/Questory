import { Module, forwardRef } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { SyncModule } from "../sync/sync.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AccountsModule, forwardRef(() => SyncModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
