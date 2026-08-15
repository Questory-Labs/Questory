import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module";
import { ScrobblerModule } from "../music/scrobbler/scrobbler.module";
import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";

@Module({
  imports: [AccountsModule, ScrobblerModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
