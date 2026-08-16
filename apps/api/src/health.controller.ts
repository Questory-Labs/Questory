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
import { MailerService } from "./mail/mailer.service";

@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly mailer: MailerService) {}

  @Get()
  check() {
    const redis = resolveRedisConfig();
    const mail = this.mailer.status();
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
      mail: {
        configured: mail.configured,
        enabled: mail.active,
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
