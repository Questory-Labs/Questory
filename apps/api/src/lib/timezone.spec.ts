import { describe, expect, it } from "vitest";
import {
  computeStreakDays,
  isValidTimeZone,
  parseTimeZone,
  zonedDayKey,
  zonedHour,
  zonedIsoWeekKey,
  zonedWeekday,
} from "./timezone";

describe("parseTimeZone", () => {
  it("defaults missing or invalid to UTC", () => {
    expect(parseTimeZone()).toBe("UTC");
    expect(parseTimeZone("")).toBe("UTC");
    expect(parseTimeZone("Not/AZone")).toBe("UTC");
  });

  it("accepts IANA zones", () => {
    expect(parseTimeZone("Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(isValidTimeZone("America/Los_Angeles")).toBe(true);
  });
});

describe("zoned day/hour around midnight edges", () => {
  // 2026-07-28T20:00:00Z = 2026-07-29 01:30 in Asia/Kolkata (UTC+5:30)
  const nearIstMidnight = new Date("2026-07-28T20:00:00.000Z");

  it("maps UTC evening to next local day in Asia/Kolkata", () => {
    expect(zonedDayKey(nearIstMidnight, "Asia/Kolkata")).toBe("2026-07-29");
    expect(zonedHour(nearIstMidnight, "Asia/Kolkata")).toBe(1);
    expect(zonedDayKey(nearIstMidnight, "UTC")).toBe("2026-07-28");
    expect(zonedHour(nearIstMidnight, "UTC")).toBe(20);
  });

  // 2026-07-29T02:00:00Z = 2026-07-28 19:00 in America/Los_Angeles (PDT)
  const eveningPdt = new Date("2026-07-29T02:00:00.000Z");

  it("maps UTC morning to previous local day in America/Los_Angeles", () => {
    expect(zonedDayKey(eveningPdt, "America/Los_Angeles")).toBe("2026-07-28");
    expect(zonedHour(eveningPdt, "America/Los_Angeles")).toBe(19);
    expect(zonedWeekday(eveningPdt, "America/Los_Angeles")).toBe(2); // Tue
  });
});

describe("zonedIsoWeekKey", () => {
  it("agrees with UTC for a mid-week UTC noon", () => {
    const wed = new Date("2026-07-29T12:00:00.000Z"); // Wed
    expect(zonedIsoWeekKey(wed, "UTC")).toMatch(/^2026-W\d{2}$/);
  });
});

describe("computeStreakDays", () => {
  it("counts consecutive local calendar days ending today", () => {
    const tz = "Asia/Kolkata";
    // "now" = 2026-07-29 10:00 IST = 2026-07-29T04:30:00Z
    const now = new Date("2026-07-29T04:30:00.000Z");
    const dates = [
      new Date("2026-07-29T03:00:00.000Z"), // July 29 IST
      new Date("2026-07-28T10:00:00.000Z"), // July 28 IST
      // gap on July 27
      new Date("2026-07-26T10:00:00.000Z"),
    ];
    expect(computeStreakDays(dates, tz, now)).toBe(2);
  });

  it("returns 0 when today has no activity", () => {
    const tz = "UTC";
    const now = new Date("2026-07-29T12:00:00.000Z");
    const dates = [new Date("2026-07-27T12:00:00.000Z")];
    expect(computeStreakDays(dates, tz, now)).toBe(0);
  });
});
