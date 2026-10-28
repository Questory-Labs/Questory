import { describe, expect, it } from "vitest";
import {
  formatMinutes,
  hltbRows,
  priceSteps,
  sessionBars,
} from "./steam.library-game.charts";

describe("library game charts", () => {
  it("formats minutes", () => {
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(112)).toBe("1h 52m");
    expect(formatMinutes(120)).toBe("2h");
  });

  it("scales session bars to the busiest day", () => {
    const bars = sessionBars([
      { date: "2026-10-01", minutes: 0 },
      { date: "2026-10-02", minutes: 60 },
      { date: "2026-10-03", minutes: 120 },
    ]);
    expect(bars.map((b) => b.height)).toEqual([0, 50, 100]);
  });

  it("builds hltb rows scaled against your hours", () => {
    const out = hltbRows(
      { mainHours: 10, extraHours: null, completionistHours: 40 },
      80,
    );
    expect(out?.rows).toEqual([
      { label: "Main story", hours: 10, width: 13 },
      { label: "Completionist", hours: 40, width: 50 },
    ]);
    expect(out?.youWidth).toBe(100);
    expect(hltbRows(null, 3)).toBeNull();
    expect(
      hltbRows({ mainHours: null, extraHours: null, completionistHours: null }, 3),
    ).toBeNull();
  });

  it("builds a step path and marks the low", () => {
    const steps = priceSteps([
      { date: "2026-01-01", price: 20 },
      { date: "2026-07-01", price: 5 },
      { date: "2026-12-31", price: 20 },
    ]);
    expect(steps?.min).toBe(5);
    expect(steps?.max).toBe(20);
    expect(steps?.path.startsWith("M0 24H")).toBe(true);
    expect(steps?.low.y).toBe(176);
    expect(priceSteps([{ date: "2026-01-01", price: 1 }])).toBeNull();
  });
});
