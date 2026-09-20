import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";

/**
 * Public liveness only. Feature flags live on GET /v1/status and
 * authenticated admin/settings — do not add them here.
 */
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  check() {
    return {
      ok: true as const,
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
