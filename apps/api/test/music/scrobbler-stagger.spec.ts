import { describe, expect, it } from "vitest";
import {
  scaledPollIntervalMs,
  staggerOffsetMs,
} from "../../src/music/scrobbler/scrobbler.constants";

describe("staggerOffsetMs", () => {
  it("spreads users across the interval", () => {
    const interval = 30_000;
    const a = staggerOffsetMs("user-a", interval);
    const b = staggerOffsetMs("user-b", interval);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(interval);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(interval);
    expect(staggerOffsetMs("user-a", interval)).toBe(a);
  });
});

describe("scaledPollIntervalMs", () => {
  it("keeps the base interval when the user count fits under the rps cap", () => {
    expect(scaledPollIntervalMs(10, 30_000, 5)).toBe(30_000);
  });

  it("stretches so 1000 users at 5 rps are not queued faster than Last.fm allows", () => {
    expect(scaledPollIntervalMs(1000, 30_000, 5)).toBe(200_000);
  });
});
