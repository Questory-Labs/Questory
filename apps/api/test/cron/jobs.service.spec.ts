import { SchedulerRegistry } from "@nestjs/schedule";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CronRunnerService } from "../../src/cron/cron-runner.service";
import { InternalCronService } from "../../src/cron/internal-cron.service";
import { JobsService } from "../../src/cron/jobs.service";
import { EnterpriseAiGoalsService } from "../../src/enterprise/enterprise-ai-goals.service";
import { FeatureFlagsService } from "../../src/features/feature-flags.service";

describe("JobsService dependency injection", () => {
  it("resolves the AI goals service through Nest", async () => {
    const summary = { users: 1, boards: 1, noSources: 0, failed: 0 };
    const refreshBoards = vi.fn().mockResolvedValue(summary);
    const moduleRef = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: InternalCronService, useValue: {} },
        { provide: CronRunnerService, useValue: {} },
        { provide: SchedulerRegistry, useValue: {} },
        { provide: FeatureFlagsService, useValue: {} },
        { provide: EnterpriseAiGoalsService, useValue: { refreshBoards } },
      ],
    }).compile();
    await expect(moduleRef.get(JobsService).refreshAiGoals()).resolves.toEqual(summary);
    expect(refreshBoards).toHaveBeenCalledTimes(1);
  });
});

describe("JobsService.runWatchSync", () => {
  const watchCron = {
    runTraktSync: vi.fn(),
    runAnilistSync: vi.fn(),
    runMalSync: vi.fn(),
    runKitsuSync: vi.fn(),
    runBangumiSync: vi.fn(),
    runShikimoriSync: vi.fn(),
    runLetterboxdScrape: vi.fn(),
  };

  const cronRunner = {
    run: vi.fn(
      async (_name: string, _by: string, fn: () => Promise<unknown>) => ({
        result: await fn(),
      }),
    ),
  };

  beforeEach(() => {
    for (const fn of Object.values(watchCron)) fn.mockReset();
    cronRunner.run.mockClear();
  });

  const service = (flags: {
    isDomainEnabled: (domain: string) => Promise<boolean>;
    isSourceEnabled: (source: string) => Promise<boolean>;
  }) =>
    new JobsService(
      {} as never,
      cronRunner as never,
      {} as never,
      flags as never,
      watchCron,
    );

  it("skips provider jobs when both Watch and Read are off", async () => {
    await service({
      isDomainEnabled: async () => false,
      isSourceEnabled: async () => true,
    }).runWatchSync();
    expect(watchCron.runTraktSync).not.toHaveBeenCalled();
    expect(watchCron.runAnilistSync).not.toHaveBeenCalled();
    expect(watchCron.runLetterboxdScrape).not.toHaveBeenCalled();
  });

  it("runs AniList when Read is on even if Watch is off", async () => {
    await service({
      isDomainEnabled: async (domain) => domain === "read",
      isSourceEnabled: async () => true,
    }).runWatchSync();
    expect(watchCron.runAnilistSync).toHaveBeenCalled();
    expect(watchCron.runTraktSync).not.toHaveBeenCalled();
  });

  it("reports ai-goals as skipped when the enterprise service is not wired", async () => {
    const result = await service({
      isDomainEnabled: async () => true,
      isSourceEnabled: async () => true,
    }).refreshAiGoals();
    expect(result).toEqual({
      users: 0,
      boards: 0,
      noSources: 0,
      failed: 0,
      skipped: "enterprise_unavailable",
    });
  });

  it("runs the ai-goals refresh through the cron runner", async () => {
    const refreshBoards = vi.fn().mockResolvedValue({ users: 1, boards: 3, noSources: 0, failed: 0 });
    const run = vi.fn(async (_name: string, _trigger: string, fn: () => Promise<unknown>) => ({
      result: await fn(),
    }));
    await new JobsService(
      {} as never,
      { run } as never,
      {} as never,
      {} as never,
      watchCron,
      { refreshBoards } as never,
    ).runAiGoals();
    expect(run).toHaveBeenCalledWith("ai-goals", "system", expect.any(Function));
    expect(refreshBoards).toHaveBeenCalledTimes(1);
  });
});
