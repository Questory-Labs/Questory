import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import {
  isAllowlistEnabled,
  resolveAppMode,
  resolveDbProvider,
  resolveRedisConfig,
  resolveSyncMode,
} from "./lib/runtime-config";
import { isLastFmConfigured } from "./music/lib/runtime-config";
import {
  isScrobblerInApi,
  isScrobblerWorkerProcess,
} from "./music/scrobbler/scrobbler.constants";

function coreHealth() {
  const redis = resolveRedisConfig();
  return {
    ok: true as const,
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
    music: {
      enabled: true,
      scrobblers: { lastfm: isLastFmConfigured() },
      scrobblerInApi: isScrobblerInApi(),
      scrobblerProcess: isScrobblerWorkerProcess() ? "scrobbler" : "api",
    },
    watch: { enabled: true },
    read: { enabled: true },
  };
}

@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  check() {
    return {
      ...coreHealth(),
      service: "questorylabs-api",
    };
  }
}

/** qMonitor baseUrl probe — always `/api/health` on BE. */
@Controller({ path: "api/health", version: VERSION_NEUTRAL })
export class ApiHealthController {
  @Get()
  check() {
    const webOrigin = (
      process.env.WEB_ORIGIN || "http://localhost:3000"
    ).replace(/\/+$/, "");
    return {
      ok: true as const,
      service: "be" as const,
      webOrigin,
    };
  }
}
