import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { Goal } from "@questorylabs/shared";

vi.mock("@/lib/goals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/goals")>()),
  fetchGoals: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));

vi.mock("@/hooks/useMusicEnabled", () => ({ useMusicEnabled: () => ({ flagOn: true }) }));
vi.mock("@/hooks/useWatchEnabled", () => ({ useWatchEnabled: () => ({ flagOn: true }) }));
vi.mock("@/hooks/useReadEnabled", () => ({ useReadEnabled: () => ({ flagOn: true }) }));

vi.mock("@/lib/enterprise-api", () => ({
  fetchSmartGoals: vi.fn(),
  fetchAiGoals: vi.fn(),
  rerollAiGoal: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "@/lib/api";
import { fetchAiGoals, fetchSmartGoals, rerollAiGoal } from "@/lib/enterprise-api";
import { createGoal, deleteGoal, fetchGoals, updateGoal } from "@/lib/goals";
import { GoalsController } from "./enterprise.goals.controller";
import { GoalsView } from "./enterprise.goals.view";

const DAY = 86_400_000;

const goal = (patch: Partial<Goal> = {}): Goal => ({
  id: "g1",
  domain: "games",
  kind: "game",
  name: "Portal 2",
  targetRef: "game:1",
  targetValue: null,
  progressValue: 0,
  estimatedMinutes: 180,
  timeframe: "week",
  periodStart: new Date(Date.now() - DAY).toISOString(),
  periodEnd: new Date(Date.now() + 10 * DAY).toISOString(),
  acceptedAt: new Date().toISOString(),
  doneAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...patch,
});

const renderPage = () =>
  render(
    <ResourceProvider store={new ResourceStore({ retries: false })}>
      <GoalsController>
        <GoalsView />
      </GoalsController>
    </ResourceProvider>,
  );

const aiBoard = (patch: Record<string, unknown> = {}) => ({
  status: "ready" as const,
  period: "2026-W45",
  goals: [
    {
      itemKey: "goal:watch:horror:movie",
      name: "Watch a horror movie",
      domain: "watch" as const,
      kind: "watch",
      reason: "Horror keeps showing up in what you finish.",
      specific: false,
    },
  ],
  rerollsLeft: 2,
  rerollsPerDay: 2,
  rerollsResetAt: "2026-11-05T00:00:00Z",
  ...patch,
});

describe("Goals page", () => {
  beforeEach(() => {
    vi.mocked(fetchGoals).mockResolvedValue({
      items: [
        goal(),
        goal({
          id: "old",
          name: "Old goal",
          periodStart: new Date(Date.now() - 60 * DAY).toISOString(),
          periodEnd: new Date(Date.now() - 30 * DAY).toISOString(),
        }),
      ],
    });
    vi.mocked(fetchSmartGoals).mockResolvedValue({
      generatedAt: "",
      timeframe: "this month",
      targetCount: 5,
      suggestions: [
        { itemKey: "game:1", name: "Portal 2", domain: "games", kind: "game", reason: "68% through." },
        {
          itemKey: "game:2",
          name: "A Short Hike",
          domain: "games",
          kind: "game",
          estimatedTimeMinutes: 120.4,
          reason: "Short and calm.",
        },
      ],
    });
    vi.mocked(fetchAiGoals).mockResolvedValue(aiBoard());
    vi.mocked(rerollAiGoal).mockResolvedValue(aiBoard({ rerollsLeft: 1 }));
    vi.mocked(api).mockResolvedValue({
      window: { sessionCount: 3, totalDurationSecs: 30 * 3600, avgDurationSecs: 1 },
    });
    vi.mocked(createGoal).mockResolvedValue(goal({ id: "g2" }));
    vi.mocked(updateGoal).mockResolvedValue(goal({ doneAt: new Date().toISOString() }));
    vi.mocked(deleteGoal).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads current goals, suggestions and the weekly average", async () => {
    renderPage();
    expect(await screen.findByText("68% through.")).toBeInTheDocument();
    expect(screen.queryByText("Old goal")).not.toBeInTheDocument();
    expect(await screen.findByText(/You average/)).toBeInTheDocument();
    expect(fetchGoals).toHaveBeenCalledWith({ status: "all", timeframe: "week", limit: 50 });
    expect(fetchSmartGoals).toHaveBeenCalledWith({ timeframe: "this week", targetCount: 5 });
    expect(api).toHaveBeenCalledWith(expect.stringContaining("/play-sessions/stats?days=30&tz="));
    expect(screen.queryByRole("button", { name: "Accept Portal 2" })).not.toBeInTheDocument();
  });

  it("accepts a suggestion as a goal and refetches", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Accept A Short Hike" }));
    await waitFor(() =>
      expect(createGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "game",
          name: "A Short Hike",
          domain: "games",
          estimatedMinutes: 120,
          targetRef: "game:2",
          timeframe: "week",
          tz: expect.any(String),
        }),
      ),
    );
    await waitFor(() => expect(fetchGoals).toHaveBeenCalledTimes(2));
  });

  it("rerolls an AI goal and refetches the board", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Reroll Watch a horror movie" }));
    await waitFor(() =>
      expect(rerollAiGoal).toHaveBeenCalledWith("goal:watch:horror:movie"),
    );
    await waitFor(() => expect(vi.mocked(fetchAiGoals).mock.calls.length).toBeGreaterThan(1));
  });

  it("shows the connect prompt when QEngine reports no sources", async () => {
    vi.mocked(fetchGoals).mockResolvedValue({ items: [] });
    vi.mocked(fetchAiGoals).mockResolvedValue(aiBoard({ status: "no_sources", goals: [] }));
    renderPage();
    expect(await screen.findByText("Connect a source to get goals")).toBeTruthy();
  });

  it("checks a goal off", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Mark Portal 2 done" }));
    await waitFor(() => expect(updateGoal).toHaveBeenCalledWith("g1", { done: true }));
  });

  it("deletes a goal only after confirming", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Remove Portal 2" }));
    expect(deleteGoal).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(deleteGoal).toHaveBeenCalledWith("g1"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("offers only this week and history", async () => {
    renderPage();
    await screen.findByText("A Short Hike");
    expect(screen.queryByRole("button", { name: "This month" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "This year" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "This week" })).toBeInTheDocument();
  });

  it("shows past goals on the history tab", async () => {
    renderPage();
    const tab = await screen.findByRole("button", { name: "History" });
    expect(fetchGoals).not.toHaveBeenCalledWith({ status: "all", limit: 100 });
    fireEvent.click(tab);
    await waitFor(() =>
      expect(fetchGoals).toHaveBeenCalledWith({ status: "all", limit: 100 }),
    );
    expect(await screen.findByText("Old goal")).toBeInTheDocument();
    expect(screen.queryByText("A Short Hike")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Target count")).not.toBeInTheDocument();
  });
});
