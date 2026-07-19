import { Controller, Post, Query, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "./cron-secret.guard";
import { InternalCronService } from "./internal-cron.service";
import { PrismaService } from "../prisma/prisma.service";

@Controller("internal/cron")
@UseGuards(CronSecretGuard)
export class InternalCronController {
  constructor(
    private readonly cron: InternalCronService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("daily-refresh")
  dailyRefresh() {
    return this.withCronRun("daily-refresh", () => this.cron.dailyRefresh());
  }

  @Post("recover-failed-sync")
  recoverFailedSync() {
    return this.withCronRun("recover-failed-sync", () =>
      this.cron.recoverFailedSync(),
    );
  }

  @Post("catalog-sync")
  catalogSync(
    @Query("forceFull") forceFull?: string,
    @Query("maxPages") maxPages?: string,
  ) {
    return this.withCronRun("catalog-sync", () =>
      this.cron.syncCatalog({
        forceFull: forceFull === "1" || forceFull === "true",
        maxPages: maxPages ? Number(maxPages) : undefined,
      }),
    );
  }

  private async withCronRun(
    jobName: string,
    fn: () => Promise<unknown> | unknown,
  ) {
    const run = await this.prisma.cronRun.create({
      data: {
        jobName,
        status: "running",
        triggeredBy: "cron",
      },
    });
    try {
      const result = await fn();
      await this.prisma.cronRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          finishedAt: new Date(),
          meta: JSON.stringify(result ?? {}),
        },
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.cronRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          error: message,
        },
      });
      throw err;
    }
  }
}
