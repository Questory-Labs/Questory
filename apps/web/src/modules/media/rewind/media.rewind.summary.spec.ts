import { describe, expect, it } from "vitest";
import type { RewindAllStats, RewindGamesStats } from "@questorylabs/shared";
import { buildRewindSummary, rewindBars } from "./media.rewind.summary";

const games: RewindGamesStats = {
  domain: "games",
  period: "2026-09",
  totalMinutes: 2760,
  sessions: 63,
  sessionsAvailable: true,
  uniqueGames: 18,
  newGames: 4,
  topGames: [{ id: "1", name: "Factorio", count: 840 }],
  topGenres: [],
  longestSession: null,
  lateNightShare: null,
  peakHour: { index: 21, label: "9pm", count: 4 },
  peakDow: { index: 2, label: "Tuesday", count: 3 },
  backlog: 157,
  achievementsInPeriod: 41,
  perfectGames: 2,
  monthly: [{ month: "2026-09-20", count: 120, topItem: "Factorio" }],
  prior: { total: 2000, deltaPct: 38, newItems: 3, returningItems: 9, coverage: true },
};

describe("rewindBars", () => {
  it("fills every day of a month and flags weekends", () => {
    const { bars, daily, peak } = rewindBars("2026-09", [{ key: "2026-09-20", value: 5, topItem: "X" }]);
    expect(daily).toBe(true);
    expect(bars).toHaveLength(30);
    expect(bars[19]).toMatchObject({ key: "2026-09-20", value: 5, weekend: true, label: "Sep 20" });
    expect(bars[0]!.weekend).toBe(false);
    expect(peak).toBe("Peak Sep 20 · mostly X");
  });

  it("fills twelve months for a year and returns nothing without activity", () => {
    expect(rewindBars("2025", [{ key: "2025-03", value: 2 }]).bars).toHaveLength(12);
    expect(rewindBars("2025", [{ key: "2025-03", value: 0 }]).bars).toEqual([]);
  });
});

describe("buildRewindSummary", () => {
  it("builds the games hero, stats and lists from real fields", () => {
    const summary = buildRewindSummary(games);
    expect(summary.hero).toMatchObject({ label: "Hours played", value: 46, unit: "h" });
    expect(summary.hero.note).toBe("18 games · +38% vs Aug 2026");
    const byKey = Object.fromEntries(summary.stats.map((s) => [s.key, s]));
    expect(byKey.achievements).toMatchObject({ value: "41", note: "2 games at 100%" });
    expect(byKey.played!.note).toBe("4 new to you");
    expect(summary.lists[0]).toMatchObject({ title: "Top games", items: [{ name: "Factorio", value: "14h" }] });
  });

  it("normalizes the combined daily series per domain and notes the busiest month", () => {
    const all: RewindAllStats = {
      domain: "all",
      period: "2026-09",
      domains: { games, music: undefined },
      daily: [
        { date: "2026-09-01", counts: { games: 60, music: 10 } },
        { date: "2026-09-02", counts: { games: 120, music: 5 } },
        { date: "2026-09-03", counts: { music: 1 } },
      ],
      busiestSince: "2026-03",
    };
    const summary = buildRewindSummary(all);
    expect(summary.hero.note).toBe("Busiest month since March 2026.");
    expect(summary.hero.bars[0]!.value).toBeCloseTo(1.5);
    expect(summary.hero.bars[1]!.value).toBeCloseTo(1.5);
    expect(summary.stats.find((s) => s.key === "streak")).toMatchObject({
      value: "3 days",
      note: "Sep 1 – Sep 3",
    });
  });

  it("reports an empty unified period", () => {
    const summary = buildRewindSummary({ domain: "all", period: "2026-09", domains: {} });
    expect(summary.hero.note).toBe("No activity in this period yet.");
    expect(summary.stats).toEqual([]);
  });
});
