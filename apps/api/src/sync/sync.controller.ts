import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SyncService } from "./sync.service";
import { CatalogService } from "../steam/catalog.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("sync")
@UseGuards(SteamAuthGuard)
export class SyncController {
  constructor(
    private readonly sync: SyncService,
    private readonly catalog: CatalogService,
  ) {}

  @Post("refresh")
  async refresh(
    @CurrentUser() user: { userId: string; steamId: string },
    @Query("force") force?: string,
  ) {
    return this.sync.enqueueAll(user.userId, user.steamId, {
      force: force === "1" || force === "true",
    });
  }

  @Get("jobs")
  async jobs(@CurrentUser() user: { userId: string; steamId: string }) {
    const jobs = await this.sync.latestJobs(user.userId);
    return {
      jobs: jobs.map((j) => ({
        id: j.id,
        type: j.type,
        status: j.status,
        error: j.error,
        startedAt: j.startedAt?.toISOString() ?? null,
        finishedAt: j.finishedAt?.toISOString() ?? null,
      })),
    };
  }

  @Get("catalog")
  catalogStatus() {
    return this.catalog.getStatus();
  }

  /** Global catalog sync is cron-only (see POST /v1/internal/cron/catalog-sync). */
  @Post("catalog")
  syncCatalog() {
    throw new ForbiddenException(
      "Global catalog sync requires cron secret via POST /v1/internal/cron/catalog-sync",
    );
  }
}
