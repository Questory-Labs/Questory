import { describe, expect, it } from "vitest";
import type { Goal, PlaySessionStats } from "@questorylabs/shared";
import type { GoalSuggestion } from "@/lib/enterprise-types";
import {
  currentPeriod,
  fitsInPeriod,
  formatHours,
  isCurrentGoal,
  localPeriod,
  pendingSuggestions,
  periodElapsed,
  remainingMinutes,
  suggestionReasons,
  weeklyAverageHours,
} from "./enterprise.goals.utils";

const goal = (patch: Partial<Goal> = {}): Goal => ({
  id: "g1",
  domain: "games",
  kind: "game",
  name: "Hades",
  targetRef: "game:1",
  targetValue: null,
  progressValue: 0,
  estimatedMinutes: 120,
  timeframe: "month",
  periodStart: new Date(2026, 9, 1).toISOString(),
  periodEnd: new Date(2026, 10, 1).toISOString(),
  acceptedAt: new Date(2026, 9, 2).toISOString(),
  doneAt: null,
  createdAt: new Date(2026, 9, 2).toISOString(),
  updatedAt: new Date(2026, 9, 2).toISOString(),
  ...patch,
});

const suggestion = (itemKey: string): GoalSuggestion => ({
  itemKey,
  name: itemKey,
  domain: "games",
  kind: "game",
  reason: `why ${itemKey}`,
});

const now = new Date(2026, 9, 28, 12);

describe("goal periods", () => {
  it("computes local week, month and year bounds", () => {
    expect(localPeriod("week", now)).toEqual({
      start: new Date(2026, 9, 26),
      end: new Date(2026, 10, 2),
    });
    expect(localPeriod("month", now)).toEqual({
      start: new Date(2026, 9, 1),
      end: new Date(2026, 10, 1),
    });
    expect(localPeriod("year", now)).toEqual({
      start: new Date(2026, 0, 1),
      end: new Date(2027, 0, 1),
    });
  });

  it("prefers the server period of an accepted goal", () => {
    const g = goal({ periodStart: "2026-09-30T18:30:00.000Z" });
    expect(currentPeriod("month", [g], now).start.toISOString()).toBe(
      "2026-09-30T18:30:00.000Z",
    );
    expect(currentPeriod("month", [], now)).toEqual(localPeriod("month", now));
  });

  it("keeps only goals whose period covers now", () => {
    expect(isCurrentGoal(goal(), now)).toBe(true);
    expect(
      isCurrentGoal(
        goal({
          periodStart: new Date(2026, 8, 1).toISOString(),
          periodEnd: new Date(2026, 9, 1).toISOString(),
        }),
        now,
      ),
    ).toBe(false);
  });

  it("clamps the elapsed share", () => {
    const period = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 11) };
    expect(periodElapsed(period, new Date(2026, 9, 6))).toBeCloseTo(0.5);
    expect(periodElapsed(period, new Date(2026, 8, 1))).toBe(0);
    expect(periodElapsed(period, new Date(2026, 11, 1))).toBe(1);
  });
});

describe("goal time", () => {
  it("formats hours", () => {
    expect(formatHours(90)).toBe("1.5h");
    expect(formatHours(660)).toBe("11h");
  });

  it("sums estimates of open goals only", () => {
    expect(
      remainingMinutes([
        goal({ estimatedMinutes: 120 }),
        goal({ id: "g2", estimatedMinutes: null }),
        goal({ id: "g3", estimatedMinutes: 60, doneAt: now.toISOString() }),
      ]),
    ).toBe(120);
  });

  it("averages the stats window per week and omits empty windows", () => {
    const stats = {
      window: { sessionCount: 4, totalDurationSecs: 30 * 3600, avgDurationSecs: 1 },
    } as PlaySessionStats;
    expect(weeklyAverageHours(stats, 30)).toBeCloseTo(7);
    expect(weeklyAverageHours(undefined, 30)).toBeNull();
    expect(
      weeklyAverageHours({ window: { sessionCount: 0, totalDurationSecs: 0, avgDurationSecs: 0 } } as PlaySessionStats, 30),
    ).toBeNull();
  });

  it("checks whether the remaining time fits the weeks left", () => {
    const period = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 15) };
    const at = new Date(2026, 9, 1);
    expect(fitsInPeriod(10 * 60, 7, period, at)).toBe(true);
    expect(fitsInPeriod(20 * 60, 7, period, at)).toBe(false);
  });
});

describe("suggestions", () => {
  it("drops suggestions already accepted and maps reasons", () => {
    const list = [suggestion("game:1"), suggestion("game:2")];
    expect(pendingSuggestions(list, [goal()]).map((s) => s.itemKey)).toEqual(["game:2"]);
    expect(suggestionReasons(list)["game:2"]).toBe("why game:2");
  });
});
