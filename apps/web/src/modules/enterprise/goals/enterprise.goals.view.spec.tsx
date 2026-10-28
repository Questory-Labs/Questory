import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Goal, GoalListResponse, PlaySessionStats } from "@questorylabs/shared";
import { mockResource } from "@/test/resource-mock";
import type {
  GoalSuggestion,
  RecommendationGoalsResponse,
} from "@/lib/enterprise-types";
import { GoalsView } from "./enterprise.goals.view";
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

const baseProps = (): GoalsViewProps => ({
  timeframe: "month",
  setTimeframe: vi.fn(),
  targetCount: 5,
  setTargetCount: vi.fn(),
  goals: mockResource<GoalListResponse>({ empty: false, failed: false, value: { items: [goal] } }),
  suggestions: mockResource<RecommendationGoalsResponse>({
    empty: false,
    failed: false,
    value: { generatedAt: "", timeframe: "this month", targetCount: 5, suggestions: [suggestion] },
  }),
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

  it("lists accepted goals with their reason and pending suggestions", () => {
    const props = renderView();
    expect(screen.getByText("Portal 2")).toBeInTheDocument();
    expect(screen.getByText("68% through.")).toBeInTheDocument();
    expect(screen.getByText("A Short Hike")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept A Short Hike" }));
    expect(props.onAccept).toHaveBeenCalledWith(suggestion);
  });

  it("switches timeframe and target", () => {
    const props = renderView();
    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    expect(props.setTimeframe).toHaveBeenCalledWith("week");
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
