import { Controller, Post, Query, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "./cron-secret.guard";
import { CronRunnerService } from "./cron-runner.service";
import { InternalCronService } from "./internal-cron.service";

@Controller("internal/cron")
@UseGuards(CronSecretGuard)
export class InternalCronController {
  constructor(
    private readonly cron: InternalCronService,
    private readonly cronRunner: CronRunnerService,
  ) {}

  @Post("daily-refresh")
  dailyRefresh() {
    return this.cronRunner
      .run("daily-refresh", "cron", () => this.cron.dailyRefresh())
      .then(({ result }) => result);
  }

  @Post("recover-failed-sync")
  recoverFailedSync() {
    return this.cronRunner
      .run("recover-failed-sync", "cron", () => this.cron.recoverFailedSync())
      .then(({ result }) => result);
  }

  @Post("catalog-sync")
  catalogSync(
    @Query("forceFull") forceFull?: string,
    @Query("maxPages") maxPages?: string,
  ) {
    return this.cronRunner
      .run("catalog-sync", "cron", () =>
        this.cron.syncCatalog({
          forceFull: forceFull === "1" || forceFull === "true",
          maxPages: maxPages ? Number(maxPages) : undefined,
        }),
      )
      .then(({ result }) => result);
  }

  @Post("price-sync")
  priceSync() {
    return this.cronRunner
      .run("price-sync", "cron", () => this.cron.syncPricesDaily())
      .then(({ result }) => result);
  }
}
