import { describe, expect, it } from "vitest";
import { listenMinutes, percentDelta, rollUpDays } from "./day-series";

const at = (iso: string, durationMs: number | null) => ({
  listenedAt: new Date(iso),
  track: { durationMs },
});

describe("rollUpDays", () => {
  it("counts listens and sums known durations per zoned day", () => {
    const buckets = rollUpDays(
      [
        at("2026-10-01T10:00:00.000Z", 180_000),
        at("2026-10-01T11:00:00.000Z", null),
        at("2026-10-01T23:30:00.000Z", 240_000),
        at("2026-10-02T09:00:00.000Z", 0),
      ],
      "UTC",
    );
    expect(buckets).toEqual([
      { key: "2026-10-01", label: "2026-10-01", count: 3, minutes: 7 },
      { key: "2026-10-02", label: "2026-10-02", count: 1, minutes: 0 },
    ]);
  });

  it("keys days in the requested time zone", () => {
    const buckets = rollUpDays(
      [at("2026-10-01T23:30:00.000Z", 60_000)],
      "Asia/Kolkata",
    );
    expect(buckets[0]?.key).toBe("2026-10-02");
  });
});

describe("listenMinutes", () => {
  it("ignores missing and non-positive durations", () => {
    expect(
      listenMinutes([
        { track: { durationMs: 90_000 } },
        { track: { durationMs: null } },
        { track: { durationMs: -5 } },
        { track: { durationMs: 30_000 } },
      ]),
    ).toBe(2);
  });
});

describe("percentDelta", () => {
  it("returns a one-decimal percent change against the previous value", () => {
    expect(percentDelta(150, 100)).toBe(50);
    expect(percentDelta(2, 3)).toBe(-33.3);
  });

  it("treats a zero baseline as +100% when there is activity, else 0", () => {
    expect(percentDelta(5, 0)).toBe(100);
    expect(percentDelta(0, 0)).toBe(0);
  });
});
