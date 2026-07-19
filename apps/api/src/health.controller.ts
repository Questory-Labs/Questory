import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import {
  isAllowlistEnabled,
  resolveAppMode,
  resolveDbProvider,
  resolveRedisConfig,
  resolveSyncMode,
} from "./lib/runtime-config";

@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  check() {
    const redis = resolveRedisConfig();
    return {
      ok: true,
      service: "questorylabs-api",
      mode: resolveAppMode(),
      allowlistEnabled: isAllowlistEnabled(),
      database: {
        provider: resolveDbProvider(),
        urlConfigured: Boolean(process.env.DATABASE_URL),
      },
      redis: {
        configured: Boolean(redis.url),
        mode: redis.mode,
        forceInline: redis.forceInline,
      },
      sync: {
        mode: resolveSyncMode(),
      },
    };
  }
}
