import { Module } from "@nestjs/common";
import { MalModule as WatchMalModule } from "../../watch/mal/mal.module";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadMalController } from "./mal.controller";

@Module({
  imports: [WatchMalModule, ReadAuthModule],
  controllers: [ReadMalController],
})
export class ReadMalModule {}
