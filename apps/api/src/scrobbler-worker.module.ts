import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";
import { CacheModule } from "./cache/cache.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ScrobblerModule } from "./music/scrobbler/scrobbler.module";

const rootEnv = resolve(process.cwd(), "../../.env");
const localEnv = resolve(process.cwd(), ".env");

/** Slim Nest context: Last.fm polls + catalog writes, no HTTP, no Steam cron. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [rootEnv, localEnv],
      expandVariables: true,
    }),
    PrismaModule,
    CacheModule,
    ScrobblerModule,
  ],
})
export class ScrobblerWorkerModule {}
