import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { resolve } from "node:path";
import { ApiClient } from "./api-client";
import { JobsService } from "./jobs.service";

const rootEnv = resolve(process.cwd(), "../../.env");
const localEnv = resolve(process.cwd(), ".env");

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [rootEnv, localEnv],
      expandVariables: true,
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [ApiClient, JobsService],
})
export class AppModule {}
