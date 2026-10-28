import { describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import {
  maxListProgress,
  percentDelta,
  readPace,
  readTitleWeeklySeries,
} from "../../src/read/analytics/read-shelf";
import { ReadAnalyticsController } from "../../src/read/analytics/analytics.controller";
import { READ_TITLE_TIMESERIES_MAX_WEEKS } from "../../src/read/analytics/analytics.constants";
import type { ReadAnalyticsService } from "../../src/read/analytics/analytics.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

const WEEK = 7 * 86_400_000;

describe("read shelf helpers", () => {
  it("computes percent deltas", () => {
    expect(percentDelta(150, 100)).toBe(50);
    expect(percentDelta(5, 0)).toBe(100);
    expect(percentDelta(0, 0)).toBe(0);
  });

  it("takes the highest progress across sources", () => {
    expect(maxListProgress([])).toEqual({
      progressChapters: null,
      progressVolumes: null,
      score: null,
    });
    expect(
      maxListProgress([
        { progressChapters: 10, progressVolumes: 4, score: 7, updatedAt: new Date(5) },
        { progressChapters: 12, progressVolumes: 1, score: 9, updatedAt: new Date(9) },
      ]),
    ).toEqual({ progressChapters: 12, progressVolumes: 4, score: 9 });
  });

  it("estimates pace", () => {
    expect(readPace(0, 8, 10, 100)).toBeNull();
    expect(readPace(16, 8, 10, null)).toEqual({
      chaptersPerWeek: 2,
      weeksToFinish: null,
    });
    expect(readPace(16, 8, 90, 100)).toEqual({
      chaptersPerWeek: 2,
      weeksToFinish: 5,
    });
  });

  it("buckets chapters into rolling weeks", async () => {
    const now = Date.parse("2026-10-27T00:00:00Z");
    const findMany = vi.fn().mockResolvedValue([
      { readAt: new Date(now - 1000), chaptersRead: 3 },
      { readAt: new Date(now - 2000), chaptersRead: null },
      { readAt: new Date(now - WEEK - 1000), chaptersRead: 2 },
    ]);
    const prisma = { readEvent: { findMany } } as unknown as PrismaService;

    const result = await readTitleWeeklySeries(prisma, "u-1", "t-1", 4, now);

    expect(result.weeks).toBe(4);
    expect(result.items.map((i) => i.count)).toEqual([0, 0, 2, 3]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "u-1", readTitleId: "t-1" }),
        take: expect.any(Number),
      }),
    );
  });
});

describe("ReadAnalyticsController.titleTimeseries", () => {
  it("validates granularity and weeks", () => {
    const titleTimeseries = vi.fn().mockResolvedValue({});
    const ctrl = new ReadAnalyticsController({
      titleTimeseries,
    } as unknown as ReadAnalyticsService);
    ctrl.titleTimeseries("u-1", "t-1", "week", "8");
    expect(titleTimeseries).toHaveBeenCalledWith("u-1", "t-1", 8);
    ctrl.titleTimeseries("u-1", "t-1", undefined, undefined);
    expect(titleTimeseries).toHaveBeenLastCalledWith("u-1", "t-1", 12);
    expect(() => ctrl.titleTimeseries("u-1", "t-1", "day", "4")).toThrow(
      BadRequestException,
    );
    expect(() =>
      ctrl.titleTimeseries(
        "u-1",
        "t-1",
        "week",
        String(READ_TITLE_TIMESERIES_MAX_WEEKS + 1),
      ),
    ).toThrow(BadRequestException);
  });
});
