import { afterEach, describe, expect, it } from "vitest";
import {
  isScrobblerInApi,
  scaledPollIntervalMs,
  shouldRunScrobblerConsumer,
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

describe("shouldRunScrobblerConsumer", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("runs in the API process when SCROBBLER_IN_API is unset", () => {
    delete process.env.SCROBBLER_IN_API;
    delete process.env.PROCESS_ROLE;
    expect(isScrobblerInApi()).toBe(true);
    expect(shouldRunScrobblerConsumer()).toBe(true);
  });

  it("queues only when SCROBBLER_IN_API=false on the API process", () => {
    process.env.SCROBBLER_IN_API = "false";
    delete process.env.PROCESS_ROLE;
    expect(isScrobblerInApi()).toBe(false);
    expect(shouldRunScrobblerConsumer()).toBe(false);
  });

  it("still consumes in the dedicated worker when SCROBBLER_IN_API=false", () => {
    process.env.SCROBBLER_IN_API = "false";
    process.env.PROCESS_ROLE = "scrobbler";
    expect(shouldRunScrobblerConsumer()).toBe(true);
  });
});

