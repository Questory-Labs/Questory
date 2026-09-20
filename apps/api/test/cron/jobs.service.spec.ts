import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobsService } from "../../src/cron/jobs.service";

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
});
