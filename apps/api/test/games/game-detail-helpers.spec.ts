import { describe, expect, it } from "vitest";
import {
  aggregateDailySessions,
  storedHltb,
} from "../../src/games/games.service";

describe("storedHltb", () => {
  const now = Date.parse("2026-10-27T00:00:00Z");
  const base = {
    id: "g1",
    hltbMainHours: 4.5,
    hltbExtraHours: 8,
    hltbCompletionistHours: 20,
  };

  it("returns stored times when fresh", () => {
    expect(
      storedHltb({ ...base, hltbSyncedAt: new Date(now - 86_400_000) }, now),
    ).toEqual({
      mainHours: 4.5,
      extraHours: 8,
      completionistHours: 20,
      sourceUrl: null,
    });
  });

  it("ignores stale or missing sync stamps", () => {
    expect(storedHltb({ ...base, hltbSyncedAt: null }, now)).toBeNull();
    expect(
      storedHltb({ ...base, hltbSyncedAt: new Date(now - 60 * 86_400_000) }, now),
    ).toBeNull();
    expect(storedHltb(null, now)).toBeNull();
  });
});

describe("aggregateDailySessions", () => {
  it("buckets minutes per UTC day across a zero-filled window", () => {
    const now = Date.parse("2026-10-27T12:00:00Z");
    const res = aggregateDailySessions(
      [
        { startedAt: new Date("2026-10-26T10:00:00Z"), durationSecs: 1800 },
        { startedAt: new Date("2026-10-26T20:00:00Z"), durationSecs: 1800 },
        { startedAt: new Date("2026-10-27T08:00:00Z"), durationSecs: 600 },
      ],
      now,
      3,
    );
    expect(res.days).toEqual([
      { date: "2026-10-25", minutes: 0 },
      { date: "2026-10-26", minutes: 60 },
      { date: "2026-10-27", minutes: 10 },
    ]);
    expect(res.count).toBe(3);
    expect(res.avgMinutes).toBe(23);
  });

  it("handles no sessions", () => {
    const res = aggregateDailySessions([], Date.now(), 90);
    expect(res.days).toHaveLength(90);
    expect(res.avgMinutes).toBe(0);
  });
});
