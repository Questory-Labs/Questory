import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type CronTriggeredBy = "cron" | "admin" | "system";

@Injectable()
export class CronRunnerService {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(
    jobName: string,
    triggeredBy: CronTriggeredBy,
    fn: () => Promise<T> | T,
    opts?: { userId?: string },
  ): Promise<{ runId: string; result: T }> {
    const run = await this.prisma.cronRun.create({
      data: {
        jobName,
        status: "running",
        triggeredBy,
        triggeredByUserId: opts?.userId,
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
      return { runId: run.id, result };
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
