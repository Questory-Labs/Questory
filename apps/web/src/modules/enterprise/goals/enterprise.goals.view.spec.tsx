import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type {
  AiGoal,
  AiGoalsResponse,
  Goal,
  GoalListResponse,
  PlaySessionStats,
} from "@questorylabs/shared";
import { mockResource } from "@/test/resource-mock";
import type {
  GoalSuggestion,
  RecommendationGoalsResponse,
} from "@/lib/enterprise-types";
import { GoalsView } from "./enterprise.goals.view";

vi.mock("@/hooks/useMusicEnabled", () => ({ useMusicEnabled: () => ({ flagOn: false }) }));
vi.mock("@/hooks/useWatchEnabled", () => ({ useWatchEnabled: () => ({ flagOn: true }) }));
vi.mock("@/hooks/useReadEnabled", () => ({ useReadEnabled: () => ({ flagOn: false }) }));

import type { GoalsViewProps } from "./enterprise.goals.types";

const goal: Goal = {
  id: "g1",
  domain: "games",
  kind: "game",
  name: "Portal 2",
  targetRef: "game:1",
  targetValue: null,
  progressValue: 0,
  estimatedMinutes: 180,
  timeframe: "month",
  periodStart: new Date(2026, 9, 1).toISOString(),
  periodEnd: new Date(2026, 10, 1).toISOString(),
  acceptedAt: new Date(2026, 9, 2).toISOString(),
  doneAt: null,
  createdAt: new Date(2026, 9, 2).toISOString(),
  updatedAt: new Date(2026, 9, 2).toISOString(),
};

const suggestion: GoalSuggestion = {
  itemKey: "game:2",
  name: "A Short Hike",
  domain: "games",
  kind: "game",
  estimatedTimeMinutes: 120,
  reason: "Short and calm.",
};

const aiGoal: AiGoal = {
  itemKey: "goal:watch:horror:movie",
  name: "Watch a horror movie this week",
  domain: "watch",
  kind: "watch",
  reason: "Horror keeps showing up in what you finish.",
  specific: false,
};

const aiBoard = (patch: Partial<AiGoalsResponse> = {}): AiGoalsResponse => ({
  status: "ready",
  period: "2026-W44",
  goals: [aiGoal],
  rerollsLeft: 2,
  rerollsPerDay: 2,
  rerollsResetAt: "2026-10-29T00:00:00Z",
  ...patch,
});

const baseProps = (): GoalsViewProps => ({
  tab: "week",
  setTab: vi.fn(),
  history: mockResource<GoalListResponse>({ empty: false, failed: false, value: { items: [] } }),
  pastGoals: [],
  targetCount: 5,
  setTargetCount: vi.fn(),
  goals: mockResource<GoalListResponse>({ empty: false, failed: false, value: { items: [goal] } }),
  suggestions: mockResource<RecommendationGoalsResponse>({
    empty: false,
    failed: false,
    value: { generatedAt: "", timeframe: "this week", targetCount: 5, suggestions: [suggestion] },
  }),
  aiGoals: mockResource<AiGoalsResponse>({ empty: false, failed: false, value: aiBoard() }),
  pendingAi: [aiGoal],
  noSources: false,
  rerollingKey: null,
  rerollError: null,
  onReroll: vi.fn(),
  stats: mockResource<PlaySessionStats>({ empty: true, failed: false }),
  current: [goal],
  pending: [suggestion],
  reasons: { "game:1": "68% through." },
  period: { start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) },
  now: new Date(2026, 9, 28),
  weeklyHours: null,
  acceptingKey: null,
  togglingId: null,
  removeTarget: null,
  setRemoveTarget: vi.fn(),
  removing: false,
  actionFailed: false,
  onAccept: vi.fn(),
  onToggle: vi.fn(),
  onConfirmRemove: vi.fn(),
});

const renderView = (patch: Partial<GoalsViewProps> = {}) => {
  const props = { ...baseProps(), ...patch };
  render(<GoalsView {...props} />);
  return props;
};

describe("GoalsView", () => {
  afterEach(cleanup);

  it("offers a reroll on each AI goal while rerolls remain", () => {
    const props = renderView();
    expect(screen.getByText("2 of 2 rerolls left today")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: `Reroll ${aiGoal.name}` }));
    expect(props.onReroll).toHaveBeenCalledWith(aiGoal);
  });

  it("removes reroll buttons once rerolls run out", () => {
    renderView({
      aiGoals: mockResource<AiGoalsResponse>({
        empty: false,
        failed: false,
        value: aiBoard({ rerollsLeft: 0 }),
      }),
    });
    expect(screen.getByText("No rerolls left today")).toBeTruthy();
    expect(screen.queryByRole("button", { name: `Reroll ${aiGoal.name}` })).toBeNull();
    expect(screen.getByRole("button", { name: `Accept ${aiGoal.name}` })).toBeTruthy();
  });

  it("shows history instead of the week's list", () => {
    renderView({ tab: "history", pastGoals: [{ ...goal, id: "old", name: "Old goal" }] });
    expect(screen.getByText("Old goal")).toBeTruthy();
    expect(screen.queryByText("Picked for you")).toBeNull();
    expect(screen.queryByLabelText("Target count")).toBeNull();
  });

  it("shows history even when no sources are connected", () => {
    renderView({ tab: "history", noSources: true, current: [] });
    expect(screen.getByText(/No past goals yet/)).toBeTruthy();
    expect(screen.queryByText("Connect a source to get goals")).toBeNull();
  });

  it("shows the reroll error", () => {
    renderView({ rerollError: "No fresh goal is available right now." });
    expect(screen.getByRole("alert").textContent).toContain("No fresh goal");
  });

  it("shows only the connect prompt when there are no sources", () => {
    renderView({ noSources: true, current: [], pending: [], pendingAi: [] });
    expect(screen.getByText("Connect a source to get goals")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Steam/ }).getAttribute("href")).toBe("/settings/stores");
    expect(screen.queryByText("Picked for you")).toBeNull();
    expect(screen.queryByText("Suggestions")).toBeNull();
  });

  it("lists accepted goals with their reason and pending suggestions", () => {
    const props = renderView();
    expect(screen.getByText("Portal 2")).toBeInTheDocument();
    expect(screen.getByText("68% through.")).toBeInTheDocument();
    expect(screen.getByText("A Short Hike")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept A Short Hike" }));
    expect(props.onAccept).toHaveBeenCalledWith(suggestion);
  });

  it("switches to history and target", () => {
    const props = renderView();
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(props.setTab).toHaveBeenCalledWith("history");
    fireEvent.change(screen.getByRole("combobox", { name: "Target count" }), {
      target: { value: "10" },
    });
    expect(props.setTargetCount).toHaveBeenCalledWith(10);
  });

  it("shows the goals error before the empty state", () => {
    renderView({
      goals: mockResource<GoalListResponse>({ empty: true, failed: true }),
      current: [],
    });
    expect(screen.getByText("Could not load your goals.")).toBeInTheDocument();
    expect(screen.queryByText("Loading your goals…")).not.toBeInTheDocument();
  });

  it("shows the suggestions error message", () => {
    renderView({
      suggestions: mockResource<RecommendationGoalsResponse>({
        empty: true,
        failed: true,
        error: new Error("QEngine offline"),
      }),
      pending: [],
    });
    expect(screen.getByText("QEngine offline")).toBeInTheDocument();
  });

  it("asks before removing a goal", () => {
    const props = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Remove Portal 2" }));
    expect(props.setRemoveTarget).toHaveBeenCalledWith(goal);
    expect(props.onConfirmRemove).not.toHaveBeenCalled();
  });

  it("confirms removal in a dialog", () => {
    const props = renderView({ removeTarget: goal });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(props.onConfirmRemove).toHaveBeenCalled();
  });

  it("reports a failed change", () => {
    renderView({ actionFailed: true });
    expect(screen.getByRole("alert")).toHaveTextContent("didn't save");
  });
});
