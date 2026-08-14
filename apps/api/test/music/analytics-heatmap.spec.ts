import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeatmapService } from "../../src/music/analytics/heatmap.service";
import {
  buildHourDowHeatmap,
  hourLabel,
  sunWeekdayToMonFirst,
} from "../../src/music/analytics/heatmap-matrix";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/music/users/users.service";

describe("buildHourDowHeatmap", () => {
  it("indexes Friday 22:00 UTC as Mon-first day 4 / hour 22", () => {
    const result = buildHourDowHeatmap(
      [{ at: new Date("2026-08-14T22:00:00Z"), count: 3 }],
      "UTC",
    );

    expect(result.cells).toHaveLength(168);
    expect(result.maxCount).toBe(3);
    expect(result.dayLabels[0]).toBe("Mon");
    expect(result.hourLabels[22]).toBe("10pm");
    const cell = result.cells.find((c) => c.day === 4 && c.hour === 22);
    expect(cell?.count).toBe(3);
    expect(hourLabel(0)).toBe("12am");
    expect(sunWeekdayToMonFirst(5)).toBe(4);
  });

  it("zones hour and weekday into America/New_York", () => {
    const result = buildHourDowHeatmap(
      [{ at: new Date("2026-08-14T22:00:00Z"), count: 1 }],
      "America/New_York",
    );
    const cell = result.cells.find((c) => c.day === 4 && c.hour === 18);
    expect(cell?.count).toBe(1);
  });
});

describe("HeatmapService.userHeatmap", () => {
  const findMany = vi.fn();
  const findById = vi.fn();
  let service: HeatmapService;

  beforeEach(() => {
    findMany.mockReset();
    findById.mockReset().mockResolvedValue({ id: "user-1" });
    const prisma = {
      listenHourBucket: { findMany },
    } as unknown as PrismaService;
    const users = { findById } as unknown as UsersService;
    service = new HeatmapService(prisma, users);
  });

  it("throws when the music user is missing", async () => {
    findById.mockResolvedValue(null);
    await expect(service.userHeatmap("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("returns a zero matrix when there are no hour buckets", async () => {
    findMany.mockResolvedValue([]);
    const result = await service.userHeatmap("user-1", "all", "UTC");
    expect(result.cells).toHaveLength(168);
    expect(result.maxCount).toBe(0);
    expect(result.cells.every((c) => c.count === 0)).toBe(true);
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { hourStart: true, listenCount: true },
    });
  });

  it("weights cells by listenCount and maps Mon-first UTC hours", async () => {
    findMany.mockResolvedValue([
      { hourStart: new Date("2026-08-14T22:00:00Z"), listenCount: 4 },
      { hourStart: new Date("2026-08-14T22:00:00Z"), listenCount: 2 },
    ]);
    const result = await service.userHeatmap("user-1", "week", "UTC");
    expect(result.maxCount).toBe(6);
    const cell = result.cells.find((c) => c.day === 4 && c.hour === 22);
    expect(cell?.count).toBe(6);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        hourStart: { gte: expect.any(Date) },
      },
      select: { hourStart: true, listenCount: true },
    });
  });
});
