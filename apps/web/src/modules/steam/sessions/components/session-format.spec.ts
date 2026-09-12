import { describe, expect, it } from "vitest";
import { formatDayAxisLabel, formatHoursTick, formatSessionDuration } from "./session-format";

describe("formatSessionDuration", () => {
  it("uses hours and leftover minutes", () => {
    expect(formatSessionDuration(2 * 3600 + 17 * 60)).toBe("2h 17m");
    expect(formatSessionDuration(3600)).toBe("1h");
    expect(formatSessionDuration(20 * 60)).toBe("20m");
    expect(formatSessionDuration(45)).toBe("45s");
  });
});

describe("formatDayAxisLabel", () => {
  it("drops the year and leading zeros", () => {
    expect(formatDayAxisLabel("2026-01-15")).toBe("1/15");
    expect(formatDayAxisLabel("nope")).toBe("nope");
  });
});

describe("formatHoursTick", () => {
  it("uses minutes below one hour", () => {
    expect(formatHoursTick(0)).toBe("0");
    expect(formatHoursTick(0.5)).toBe("30m");
    expect(formatHoursTick(1.5)).toBe("1.5h");
    expect(formatHoursTick(2)).toBe("2h");
  });
});
