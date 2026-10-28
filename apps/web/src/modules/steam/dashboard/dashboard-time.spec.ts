import { describe, expect, it } from "vitest";
import { greeting, timePlayedModel, toHours, weekdayIndex } from "./dashboard-time";

const now = new Date(2026, 9, 28, 14, 30);
const weekHourlySecs = Array.from({ length: 168 }, (_, i) => (i === 50 ? 3600 : i === 61 ? 1800 : 0));
const timePlayed = {
  todaySecs: 1800,
  weekSecs: 5400,
  monthSecs: 36000,
  priorWeekSecs: 3600,
  weekHourlySecs,
};

describe("dashboard-time", () => {
  it("greets by local hour", () => {
    expect(greeting(new Date(2026, 9, 28, 3))).toBe("Good night");
    expect(greeting(new Date(2026, 9, 28, 9))).toBe("Good morning");
    expect(greeting(now)).toBe("Good afternoon");
    expect(greeting(new Date(2026, 9, 28, 18))).toBe("Good evening");
  });

  it("indexes weeks Monday-first", () => {
    expect(weekdayIndex(new Date(2026, 9, 26))).toBe(0);
    expect(weekdayIndex(new Date(2026, 10, 1))).toBe(6);
    expect(toHours(5400)).toBe(1.5);
  });

  it("builds the week model with a delta and one peak per day", () => {
    const model = timePlayedModel(timePlayed, "week", now);
    expect(model.hours).toBe(1.5);
    expect(model.avgPerDayHours).toBe(0.5);
    expect(model.deltaHours).toBe(0.5);
    expect(model.chart?.ticks).toHaveLength(7);
    expect(model.chart?.peaks.map((p) => p.index)).toEqual([50]);
  });

  it("builds the today model from the current day slice", () => {
    const model = timePlayedModel(timePlayed, "today", now);
    expect(model.hours).toBe(0.5);
    expect(model.deltaHours).toBeNull();
    expect(model.chart?.peaks.map((p) => p.index)).toEqual([2, 13]);
  });

  it("omits the chart for month", () => {
    const model = timePlayedModel(timePlayed, "month", now);
    expect(model.hours).toBe(10);
    expect(model.avgPerDayHours).toBe(0.4);
    expect(model.chart).toBeNull();
  });
});
