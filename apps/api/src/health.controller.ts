import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";

/**
 * Public liveness + feature soft-gates. Do not add mode, database, Redis,
 * allowlist, or credential-configured flags — those belong on authenticated
 * admin/settings surfaces.
 */
function coreHealth() {
  return {
    ok: true as const,
    music: { enabled: true },
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
