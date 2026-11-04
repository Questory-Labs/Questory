import { describe, expect, it } from "vitest";
import {
  peakIndex,
  precisionLabel,
  progressFraction,
  ratingDots,
  sourceLabel,
  splitHoursMinutes,
  toShares,
} from "./shelf.utils";

describe("shelf.utils", () => {
  it("finds the peak index or -1 when all zero", () => {
    expect(peakIndex([{ count: 1 }, { count: 4 }, { count: 4 }])).toBe(1);
    expect(peakIndex([{ count: 0 }])).toBe(-1);
  });

  it("computes rounded shares against a total or the sum", () => {
    const items = [
      { key: "a", label: "A", count: 1 },
      { key: "b", label: "B", count: 3 },
    ];
    expect(toShares(items, 0).map((s) => s.pct)).toEqual([25, 75]);
    expect(toShares(items, 8).map((s) => s.pct)).toEqual([13, 38]);
    expect(toShares([{ key: "a", label: "A", count: 0 }], 0)[0].pct).toBe(0);
  });

  it("clamps progress and returns null without a total", () => {
    expect(progressFraction(5, 10)).toBe(0.5);
    expect(progressFraction(12, 10)).toBe(1);
    expect(progressFraction(1, null)).toBeNull();
    expect(progressFraction(1, 0)).toBeNull();
  });

  it("builds rating dots", () => {
    expect(ratingDots(3)).toEqual([true, true, true, false, false]);
    expect(ratingDots(null)).toEqual([false, false, false, false, false]);
  });

  it("splits minutes", () => {
    expect(splitHoursMinutes(125)).toEqual({ hours: 2, minutes: 5 });
  });

  it("labels sources and precision", () => {
    expect(sourceLabel("mal")).toBe("MyAnimeList");
    expect(sourceLabel("other")).toBe("other");
    expect(precisionLabel("second")).toBe("exact time");
    expect(precisionLabel("date")).toBe("date only");
    expect(precisionLabel("unknown")).toBe("time unknown");
    expect(precisionLabel("month")).toBe("month");
  });
});
