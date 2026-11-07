import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCronSchedule } from "../../src/cron/cron-schedules";
import {
  HLTB_BACKFILL_LIMIT,
  HltbBackfillService,
} from "../../src/cron/hltb-backfill.service";

describe("hltb-backfill cron schedule", () => {
  const prev = process.env.CRON_HLTB_BACKFILL_SCHEDULE;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.CRON_HLTB_BACKFILL_SCHEDULE;
    } else {
      process.env.CRON_HLTB_BACKFILL_SCHEDULE = prev;
    }
  });

  it("defaults to 02:15 daily", () => {
    delete process.env.CRON_HLTB_BACKFILL_SCHEDULE;
    expect(getCronSchedule("hltb-backfill")).toBe("15 2 * * *");
  });

  it("respects CRON_HLTB_BACKFILL_SCHEDULE override", () => {
    process.env.CRON_HLTB_BACKFILL_SCHEDULE = "0 1 * * *";
    expect(getCronSchedule("hltb-backfill")).toBe("0 1 * * *");
  });
});

describe("HltbBackfillService.run", () => {
  const findMany = vi.fn();
  const update = vi.fn();
  const lookup = vi.fn();
  let service: HltbBackfillService;

  beforeEach(() => {
    findMany.mockReset();
    update.mockReset().mockResolvedValue(undefined);
    lookup.mockReset();
    service = new HltbBackfillService(
      { game: { findMany, update } } as never,
      { lookup } as never,
    );
  });

  it("queries only queued games with missing or stale HLTB data, capped per run", async () => {
    findMany.mockResolvedValue([]);
    const res = await service.run(new Date("2026-11-07T02:15:00Z"));
    const args = findMany.mock.calls[0][0];
    expect(args.take).toBe(HLTB_BACKFILL_LIMIT);
    expect(args.where.libraryEntries.some.userStatus.in).toEqual([
      "backlog",
      "playing",
      "shelved",
    ]);
    expect(args.where.OR[0]).toEqual({ hltbSyncedAt: null });
    expect(args.where.OR[1].hltbSyncedAt.lt).toBeInstanceOf(Date);
    expect(res).toEqual({ scanned: 0, updated: 0, missed: 0, failed: 0 });
  });

  it("writes hours for hits, stamps misses without clearing known hours, and counts failures", async () => {
    findMany.mockResolvedValue([
      { id: "g1", name: "Hit" },
      { id: "g2", name: "Miss" },
      { id: "g3", name: "Boom" },
    ]);
    lookup.mockImplementation(async (name: string) => {
      if (name === "Hit") {
        return { mainHours: 12, extraHours: 20, completionistHours: 40, sourceUrl: "x" };
      }
      if (name === "Boom") throw new Error("hltb down");
      return null;
    });
    const now = new Date("2026-11-07T02:15:00Z");
    const res = await service.run(now);
    expect(res).toEqual({ scanned: 3, updated: 1, missed: 1, failed: 1 });
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: {
        hltbMainHours: 12,
        hltbExtraHours: 20,
        hltbCompletionistHours: 40,
        hltbSyncedAt: now,
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "g2" },
      data: { hltbSyncedAt: now },
    });
  });

  it("never runs more than two lookups at once", async () => {
    findMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => ({ id: `g${i}`, name: `G${i}` })),
    );
    let inFlight = 0;
    let peak = 0;
    lookup.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 2));
      inFlight -= 1;
      return null;
    });
    await service.run();
    expect(peak).toBe(2);
    expect(lookup).toHaveBeenCalledTimes(6);
  });
});
