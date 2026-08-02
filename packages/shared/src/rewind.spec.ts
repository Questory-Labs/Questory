import { describe, expect, it } from "vitest";
import {
  completedRewindMonths,
  defaultRewindMonthForYear,
  getRewindAiPeriodError,
  isRewindAiGenerationAllowed,
  latestCompletedRewindMonth,
} from "./rewind";

const aug2026 = new Date(2026, 7, 2);

describe("rewind period rules", () => {
  it("blocks yearly rewind for the current year", () => {
    expect(isRewindAiGenerationAllowed("2026", aug2026)).toBe(false);
    expect(getRewindAiPeriodError("2026", aug2026)).toMatch(/completed years/i);
  });

  it("allows yearly rewind for past years", () => {
    expect(isRewindAiGenerationAllowed("2025", aug2026)).toBe(true);
    expect(getRewindAiPeriodError("2025", aug2026)).toBeNull();
  });

  it("allows monthly rewind for the current year", () => {
    expect(isRewindAiGenerationAllowed("2026-07", aug2026)).toBe(true);
    expect(getRewindAiPeriodError("2026-07", aug2026)).toBeNull();
  });

  it("lists only completed months for the current year", () => {
    expect(completedRewindMonths(2026, aug2026)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(latestCompletedRewindMonth(2026, aug2026)).toBe(7);
    expect(defaultRewindMonthForYear(2026, aug2026)).toBe(7);
  });

  it("defaults past years to all months", () => {
    expect(completedRewindMonths(2025, aug2026)).toHaveLength(12);
    expect(defaultRewindMonthForYear(2025, aug2026)).toBe("all");
  });

  it("returns no completed months in January of the current year", () => {
    const jan2026 = new Date(2026, 0, 15);
    expect(completedRewindMonths(2026, jan2026)).toEqual([]);
    expect(latestCompletedRewindMonth(2026, jan2026)).toBeNull();
  });
});
