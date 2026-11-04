import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import {
  busiestDay,
  commonExtras,
  compareToPrior,
  droppedOff,
  longestGapDays,
  longestStreakDays,
  monthlySeries,
  parseRewindTimeZone,
  priorPeriodBounds,
  zonedMidnight,
  zonedPeriodBounds,
} from "../../src/lib/rewind-stats";

describe("zonedPeriodBounds", () => {
  it("uses local midnight, not UTC", () => {
    const { start, end } = zonedPeriodBounds("2025", "Asia/Kolkata");
    expect(start.toISOString()).toBe("2024-12-31T18:30:00.000Z");
    expect(end.toISOString()).toBe("2025-12-31T18:30:00.000Z");
  });

  it("handles DST in both hemispheres", () => {
    expect(zonedPeriodBounds("2025-04", "America/New_York").start.toISOString()).toBe(
      "2025-04-01T04:00:00.000Z",
    );
    expect(zonedPeriodBounds("2025-02", "America/New_York").start.toISOString()).toBe(
      "2025-02-01T05:00:00.000Z",
    );
    expect(zonedPeriodBounds("2025-01", "Australia/Sydney").start.toISOString()).toBe(
      "2024-12-31T13:00:00.000Z",
    );
    expect(zonedPeriodBounds("2025-07", "Australia/Sydney").start.toISOString()).toBe(
      "2025-06-30T14:00:00.000Z",
    );
  });

  it("finds midnight on a DST transition day", () => {
    expect(zonedMidnight(2025, 3, 9, "America/New_York").toISOString()).toBe(
      "2025-03-09T05:00:00.000Z",
    );
    expect(zonedMidnight(2025, 11, 2, "America/New_York").toISOString()).toBe(
      "2025-11-02T04:00:00.000Z",
    );
  });

  it("rolls December into the next year", () => {
    const { end } = zonedPeriodBounds("2025-12", "UTC");
    expect(end.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns the prior period across a year edge", () => {
    const { start, end } = priorPeriodBounds("2025-01", "UTC");
    expect(start.toISOString()).toBe("2024-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("rejects malformed periods and zones", () => {
    expect(() => zonedPeriodBounds("2025-13", "UTC")).toThrow(BadRequestException);
    expect(() => zonedPeriodBounds("nope", "UTC")).toThrow(BadRequestException);
    expect(() => parseRewindTimeZone("Not/AZone")).toThrow(BadRequestException);
    expect(parseRewindTimeZone(undefined)).toBe("UTC");
    expect(parseRewindTimeZone(" Asia/Kolkata ")).toBe("Asia/Kolkata");
  });
});

describe("streaks and gaps", () => {
  it("measures the longest run anywhere in the period", () => {
    const days = [
      "2025-01-01",
      "2025-01-02",
      "2025-01-03",
      "2025-01-10",
      "2025-01-11",
      "2025-01-02",
    ];
    expect(longestStreakDays(days)).toBe(3);
    expect(longestGapDays(days)).toBe(6);
  });

  it("crosses month and year edges", () => {
    expect(
      longestStreakDays(["2024-12-31", "2025-01-01", "2025-02-28", "2025-03-01"]),
    ).toBe(2);
    expect(longestStreakDays([])).toBe(0);
    expect(longestGapDays(["2025-01-01"])).toBe(0);
  });

  it("buckets the busiest day in the local zone", () => {
    const at = (iso: string) => new Date(iso);
    const day = busiestDay(
      [
        at("2025-03-01T20:00:00Z"),
        at("2025-03-01T19:00:00Z"),
        at("2025-03-01T10:00:00Z"),
      ],
      "Asia/Kolkata",
    );
    expect(day).toEqual({ date: "2025-03-02", count: 2 });
    expect(busiestDay([], "UTC")).toBeNull();
  });
});

describe("monthlySeries", () => {
  const ev = (iso: string, itemId: string) => ({
    at: new Date(iso),
    itemId,
    name: `N ${itemId}`,
  });

  it("gives 12 buckets for a year with the top item per month", () => {
    const series = monthlySeries(
      "2025",
      [
        ev("2025-01-05T00:00:00Z", "a"),
        ev("2025-01-06T00:00:00Z", "a"),
        ev("2025-01-07T00:00:00Z", "b"),
        ev("2025-03-01T00:00:00Z", "c"),
      ],
      "UTC",
    );
    expect(series).toHaveLength(12);
    expect(series[0]).toEqual({ month: "2025-01", count: 3, topItem: "N a" });
    expect(series[1]).toEqual({ month: "2025-02", count: 0, topItem: null });
    expect(series[2]!.count).toBe(1);
  });

  it("gives daily buckets for a month", () => {
    const series = monthlySeries("2024-02", [ev("2024-02-29T12:00:00Z", "a")], "UTC");
    expect(series).toHaveLength(29);
    expect(series[28]).toEqual({ month: "2024-02-29", count: 1, topItem: "N a" });
  });
});

describe("prior comparison", () => {
  it("computes deltas and new vs returning items", () => {
    expect(
      compareToPrior({
        total: 150,
        priorTotal: 100,
        currentItemIds: new Set(["a", "b", "c"]),
        priorItemIds: new Set(["a", "z"]),
        coverage: true,
      }),
    ).toEqual({
      total: 100,
      deltaPct: 50,
      newItems: 2,
      returningItems: 1,
      coverage: true,
    });
  });

  it("has no delta without prior activity", () => {
    expect(
      compareToPrior({
        total: 5,
        priorTotal: 0,
        currentItemIds: new Set(),
        priorItemIds: new Set(),
        coverage: false,
      }).deltaPct,
    ).toBeNull();
  });

  it("lists what faded out, most played first", () => {
    expect(
      droppedOff(
        [
          { id: "a", name: "A", count: 3 },
          { id: "b", name: "B", count: 9 },
          { id: "c", name: "C", count: 5 },
        ],
        new Set(["c"]),
      ).map((i) => i.name),
    ).toEqual(["B", "A"]);
  });

  it("drops the faded list when history starts after the prior period", () => {
    const extras = commonExtras({
      period: "2025",
      timeZone: "UTC",
      events: [{ at: new Date("2025-06-01T00:00:00Z"), itemId: "a", name: "A" }],
      prior: [{ id: "b", name: "B", count: 4 }],
      priorStart: new Date("2024-01-01T00:00:00Z"),
      earliestEventAt: new Date("2024-09-01T00:00:00Z"),
    });
    expect(extras.prior?.coverage).toBe(false);
    expect(extras.droppedOff).toEqual([]);
    expect(extras.activeDays).toBe(1);
    expect(extras.monthly).toHaveLength(12);
  });
});
