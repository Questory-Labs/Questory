import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { Goal, GoalListResponse } from "@questorylabs/shared";
import { GoalsCard } from "./GoalsCard";

const goal = (patch: Partial<Goal>): Goal => ({
  id: "g1",
  domain: "games",
  kind: "finish_game",
  name: "Finish Hades",
  targetRef: null,
  targetValue: 10,
  progressValue: 4,
  estimatedMinutes: null,
  timeframe: "month",
  periodStart: "2026-10-01",
  periodEnd: "2026-10-31",
  acceptedAt: "2026-10-01",
  doneAt: null,
  createdAt: "2026-10-01",
  updatedAt: "2026-10-01",
  ...patch,
});

const goals = (patch: Partial<UseResourceResult<GoalListResponse>>) =>
  ({ value: undefined, failed: false, empty: false, ...patch }) as UseResourceResult<GoalListResponse>;

describe("GoalsCard", () => {
  afterEach(cleanup);

  it("lists goals with progress values", () => {
    render(
      <GoalsCard
        goals={goals({
          value: {
            items: [
              goal({}),
              goal({ id: "g2", name: "Read more", targetValue: null, doneAt: "2026-10-02" }),
            ],
          },
        })}
      />,
    );
    expect(screen.getByText("Finish Hades")).toBeInTheDocument();
    expect(screen.getByText("4 of 10")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows the error before the empty state", () => {
    render(<GoalsCard goals={goals({ failed: true, empty: true })} />);
    expect(screen.getByText("Could not load goals.")).toBeInTheDocument();
  });

  it("invites picking goals when none are active", () => {
    render(<GoalsCard goals={goals({ value: { items: [] } })} />);
    expect(screen.getByRole("link", { name: "Pick some" })).toHaveAttribute(
      "href",
      "/recommendations/goals",
    );
  });
});
