import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { resolveAppMode, resolveDbProvider } from "./lib/runtime-config";

@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  check() {
    return {
      ok: true,
      service: "questorylabs-music",
      mode: resolveAppMode(),
      database: {
        provider: resolveDbProvider(),
        urlConfigured: Boolean(process.env.DATABASE_URL),
        shared: true,
      },
      /** Ingest tokens are per-user ApiKeys minted in Settings → Profile. */
      ingestConfigured: true,
    };
  }
}
