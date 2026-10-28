import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Goal } from "@questorylabs/shared";

vi.mock("@/lib/api", () => ({
  api: vi.fn(async () => ({})),
}));

import { api } from "@/lib/api";
import {
  createGoal,
  deleteGoal,
  fetchGoals,
  goalKindLabel,
  goalProgress,
  goalsPath,
  updateGoal,
} from "./goals";

const apiMock = vi.mocked(api);

const goal = (patch: Partial<Goal> = {}): Goal => ({
  id: "g1",
  domain: "games",
  kind: "game",
  name: "Hades",
  targetRef: "game:1",
  targetValue: null,
  progressValue: 0,
  estimatedMinutes: 600,
  timeframe: "month",
  periodStart: "2026-10-01T00:00:00.000Z",
  periodEnd: "2026-11-01T00:00:00.000Z",
  acceptedAt: "2026-10-02T00:00:00.000Z",
  doneAt: null,
  createdAt: "2026-10-02T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  ...patch,
});

describe("goals lib", () => {
  beforeEach(() => apiMock.mockClear());

  it("builds list paths from the set filters only", () => {
    expect(goalsPath({})).toBe("/goals");
    expect(goalsPath({ status: "all", timeframe: "week", limit: 50 })).toBe(
      "/goals?status=all&timeframe=week&limit=50",
    );
    expect(goalsPath({ domain: "music" })).toBe("/goals?domain=music");
  });

  it("labels kinds, including daily listens and unknown kinds", () => {
    expect(goalKindLabel("game")).toBe("Finish");
    expect(goalKindLabel("show")).toBe("Watch");
    expect(goalKindLabel("daily_listens")).toBe("Daily listens");
    expect(goalKindLabel("new_kind")).toBe("new kind");
  });

  it("calls the goal endpoints with the right verbs", async () => {
    await fetchGoals({ status: "active" });
    expect(apiMock).toHaveBeenLastCalledWith("/goals?status=active");

    await createGoal({ kind: "game", name: "Hades", domain: "games", timeframe: "month" });
    expect(apiMock).toHaveBeenLastCalledWith("/goals", {
      method: "POST",
      body: JSON.stringify({ kind: "game", name: "Hades", domain: "games", timeframe: "month" }),
    });

    await updateGoal("a/b", { done: true });
    expect(apiMock).toHaveBeenLastCalledWith("/goals/a%2Fb", {
      method: "PATCH",
      body: JSON.stringify({ done: true }),
    });

    await deleteGoal("g1");
    expect(apiMock).toHaveBeenLastCalledWith("/goals/g1", { method: "DELETE" });
  });

  it("reports progress from done state or a numeric target", () => {
    expect(goalProgress(goal({ doneAt: "2026-10-03T00:00:00.000Z" }))).toBe(1);
    expect(goalProgress(goal())).toBe(0);
    expect(goalProgress(goal({ targetValue: 20, progressValue: 5 }))).toBe(0.25);
    expect(goalProgress(goal({ targetValue: 20, progressValue: 50 }))).toBe(1);
  });
});
