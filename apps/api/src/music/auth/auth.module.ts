import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { SessionUserGuard } from "./session-user.guard";

@Module({
  imports: [UsersModule],
  providers: [SessionUserGuard],
  exports: [SessionUserGuard, UsersModule],
})
export class AuthModule {}
