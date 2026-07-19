import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import {
  resolveAppMode,
  resolveDbProvider,
  resolveTmdbApiKey,
  resolveTraktClientId,
} from "./lib/runtime-config";

@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  health() {
    return {
      ok: true,
      service: "questorylabs-watch",
      mode: resolveAppMode(),
      database: {
        provider: resolveDbProvider(),
        urlConfigured: Boolean(process.env.DATABASE_URL),
      },
      traktConfigured: Boolean(resolveTraktClientId()),
      tmdbConfigured: Boolean(resolveTmdbApiKey()),
    };
  }
}
