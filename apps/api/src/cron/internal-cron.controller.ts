import { Controller, Post, Query, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "./cron-secret.guard";
import { InternalCronService } from "./internal-cron.service";

@Controller("internal/cron")
@UseGuards(CronSecretGuard)
export class InternalCronController {
  constructor(private readonly cron: InternalCronService) {}

  @Post("daily-refresh")
  dailyRefresh() {
    return this.cron.dailyRefresh();
  }

  @Post("recover-failed-sync")
  recoverFailedSync() {
    return this.cron.recoverFailedSync();
  }

  @Post("catalog-sync")
  catalogSync(
    @Query("forceFull") forceFull?: string,
    @Query("maxPages") maxPages?: string,
  ) {
    return this.cron.syncCatalog({
      forceFull: forceFull === "1" || forceFull === "true",
      maxPages: maxPages ? Number(maxPages) : undefined,
    });
  }
}
