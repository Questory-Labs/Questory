import { Module } from "@nestjs/common";
import { UsersModule } from "../../watch/users/users.module";
import { ReadSessionUserGuard } from "./session-user.guard";

@Module({
  imports: [UsersModule],
  providers: [ReadSessionUserGuard],
  exports: [ReadSessionUserGuard, UsersModule],
})
export class ReadAuthModule {}
