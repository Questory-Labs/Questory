import { describe, expect, it } from "vitest";
import type { PlaySessionStats } from "@questorylabs/shared";
import {
  dominantDaypart,
  hoursPerDay,
  sessionSpan,
  splitDuration,
  windowTotals,
} from "./sessions-insights";

const base: PlaySessionStats = {
  sessionCount: 9,
  totalDurationSecs: 99_000,
  avgDurationSecs: 11_000,
  weekDurationSecs: 0,
  weekSessionCount: 0,
  unmatchedCount: 0,
  uniqueGames: 0,
  lastPlayedAt: null,
  windowDays: 14,
  weekDays: 7,
  byDay: [
    { day: "2026-10-24", durationSecs: 3600, sessionCount: 1 },
    { day: "2026-10-25", durationSecs: 7200, sessionCount: 2 },
    { day: "2026-10-26", durationSecs: 0, sessionCount: 0 },
  ],
  topGames: [],
};

describe("sessions insights", () => {
  it("builds hour bars with a peak, an average and the last day flagged", () => {
    const model = hoursPerDay(base.byDay);
    expect(model.bars.map((b) => b.hours)).toEqual([1, 2, 0]);
    expect(model.bars[1]!.peak).toBe(true);
    expect(model.bars[2]!.last).toBe(true);
    expect(model.avgHours).toBe(1);
    expect(model.peakHours).toBe(2);
    expect(model.peakLabel).toBe("Sun");
  });

  it("has no peak when the window is empty", () => {
    expect(hoursPerDay([]).peakLabel).toBeNull();
  });

  it("prefers server window totals and falls back to the day buckets", () => {
    expect(
      windowTotals({
        ...base,
        window: { sessionCount: 2, totalDurationSecs: 60, avgDurationSecs: 30 },
      }).sessionCount,
    ).toBe(2);
    expect(windowTotals(base)).toEqual({
      sessionCount: 3,
      totalDurationSecs: 10_800,
      avgDurationSecs: 3600,
    });
  });

  it("names the dominant part of the day", () => {
    expect(dominantDaypart(undefined)).toBeNull();
    expect(dominantDaypart(new Array(24).fill(0))).toBeNull();
    const hours = new Array(24).fill(0);
    hours[9] = 100;
    hours[23] = 50;
    expect(dominantDaypart(hours)).toBe("mostly in the morning");
    hours[1] = 80;
    expect(dominantDaypart(hours)).toBe("mostly after dark");
  });

  it("places a session on the 24h track and clips at midnight", () => {
    const start = new Date(2026, 9, 24, 12, 0, 0).toISOString();
    expect(sessionSpan(start, 6 * 3600)).toEqual({ left: "50.00%", width: "25.00%" });
    const late = new Date(2026, 9, 24, 18, 0, 0).toISOString();
    expect(sessionSpan(late, 12 * 3600)).toEqual({ left: "75.00%", width: "25.00%" });
  });

  it("splits durations into hours and minutes", () => {
    expect(splitDuration(3 * 3600 + 5 * 60 + 30)).toEqual({ hours: 3, minutes: 5 });
    expect(splitDuration(-5)).toEqual({ hours: 0, minutes: 0 });
  });
});
