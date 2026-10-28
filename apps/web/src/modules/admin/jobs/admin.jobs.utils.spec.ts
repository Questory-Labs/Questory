import { describe, expect, it } from "vitest";
import { durationLabel, relativeTime } from "./admin.jobs.utils";

const NOW = Date.parse("2026-10-27T12:00:00.000Z");
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

describe("relativeTime", () => {
  it("formats past times", () => {
    expect(relativeTime(at(-10_000), NOW)).toBe("just now");
    expect(relativeTime(at(-2 * 60_000), NOW)).toBe("2 min ago");
    expect(relativeTime(at(-3 * 3_600_000), NOW)).toBe("3 h ago");
    expect(relativeTime(at(-2 * 86_400_000), NOW)).toBe("2 d ago");
  });

  it("formats future times", () => {
    expect(relativeTime(at(13 * 60_000), NOW)).toBe("in 13 min");
    expect(relativeTime(at(5 * 3_600_000), NOW)).toBe("in 5 h");
  });

  it("falls back to a dash for missing or invalid input", () => {
    expect(relativeTime(null, NOW)).toBe("—");
    expect(relativeTime("nope", NOW)).toBe("—");
  });
});

describe("durationLabel", () => {
  it("formats seconds, minutes and hours", () => {
    expect(durationLabel(at(0), at(41_000))).toBe("41s");
    expect(durationLabel(at(0), at(192_000))).toBe("3m 12s");
    expect(durationLabel(at(0), at(360_000))).toBe("6m");
    expect(durationLabel(at(0), at(3_900_000))).toBe("1h 5m");
  });

  it("returns null without a finish time", () => {
    expect(durationLabel(at(0), null)).toBeNull();
  });
});
