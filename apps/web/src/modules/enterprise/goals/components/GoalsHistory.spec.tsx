import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { Goal, GoalListResponse } from "@questorylabs/shared";
import { mockResource } from "@/test/resource-mock";
import { GoalsHistory } from "./GoalsHistory";

const goal = (patch: Partial<Goal>): Goal => ({
  id: "g",
  domain: "games",
  kind: "game",
  name: "Goal",
  targetRef: null,
  targetValue: null,
  progressValue: 0,
  estimatedMinutes: null,
  timeframe: "week",
  periodStart: new Date(2026, 9, 19).toISOString(),
  periodEnd: new Date(2026, 9, 26).toISOString(),
  acceptedAt: new Date(2026, 9, 19).toISOString(),
  doneAt: null,
  createdAt: new Date(2026, 9, 19).toISOString(),
  updatedAt: new Date(2026, 9, 19).toISOString(),
  ...patch,
});

const history = mockResource<GoalListResponse>({ empty: false, failed: false, value: { items: [] } });

const handlers = { togglingId: null, onToggle: () => undefined, onRemove: () => undefined };

describe("GoalsHistory", () => {
  afterEach(cleanup);

  it("groups goals by week with done counts and outcomes", () => {
    render(
      <GoalsHistory
        {...handlers}
        history={history}
        now={new Date(2026, 10, 4)}
        goals={[
          goal({ id: "a", name: "Finished", doneAt: new Date(2026, 9, 20).toISOString() }),
          goal({ id: "b", name: "Skipped" }),
          goal({
            id: "c",
            name: "Earlier",
            periodStart: new Date(2026, 9, 12).toISOString(),
            periodEnd: new Date(2026, 9, 19).toISOString(),
          }),
        ]}
      />,
    );
    const groups = screen.getAllByRole("region");
    expect(groups).toHaveLength(2);
    expect(within(groups[0]!).getByText("1 of 2 done")).toBeTruthy();
    expect(within(groups[0]!).getByText("Done")).toBeTruthy();
    expect(within(groups[0]!).getByText("Missed")).toBeTruthy();
    expect(within(groups[1]!).getByText("0 of 1 done")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps an older monthly goal visible as in progress", () => {
    render(
      <GoalsHistory
        {...handlers}
        history={history}
        now={new Date(2026, 10, 4)}
        goals={[
          goal({
            name: "Old monthly",
            timeframe: "month",
            periodStart: new Date(2026, 10, 1).toISOString(),
            periodEnd: new Date(2026, 11, 1).toISOString(),
          }),
        ]}
      />,
    );
    expect(screen.getByText("In progress")).toBeTruthy();
  });

  it("lets a legacy goal in an open period be completed or removed", () => {
    const onToggle = vi.fn();
    const onRemove = vi.fn();
    const monthly = goal({
      name: "Old monthly",
      timeframe: "month",
      periodStart: new Date(2026, 10, 1).toISOString(),
      periodEnd: new Date(2026, 11, 1).toISOString(),
    });
    render(
      <GoalsHistory
        history={history}
        now={new Date(2026, 10, 4)}
        goals={[monthly]}
        togglingId={null}
        onToggle={onToggle}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark done: Old monthly" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Old monthly" }));
    expect(onToggle).toHaveBeenCalledWith(monthly);
    expect(onRemove).toHaveBeenCalledWith(monthly);
  });

  it("explains an empty history", () => {
    render(<GoalsHistory {...handlers} history={history} goals={[]} />);
    expect(screen.getByText(/No past goals yet/)).toBeTruthy();
  });
});
