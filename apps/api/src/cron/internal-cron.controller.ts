import { Controller, Post, UseGuards } from "@nestjs/common";
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
}
