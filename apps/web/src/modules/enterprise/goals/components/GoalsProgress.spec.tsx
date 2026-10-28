import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Goal } from "@questorylabs/shared";
import { GoalsProgress } from "./GoalsProgress";

const goal = (id: string, patch: Partial<Goal> = {}): Goal => ({
  id,
  domain: "games",
  kind: "game",
  name: id,
  targetRef: null,
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
  ...patch,
});

const period = { start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) };
const now = new Date(2026, 9, 28);

describe("GoalsProgress", () => {
  afterEach(cleanup);

  it("shows x of y, the period edges and the weekly fit", () => {
    render(
      <GoalsProgress
        timeframe="month"
        goals={[goal("a", { doneAt: now.toISOString() }), goal("b"), goal("c")]}
        period={period}
        now={now}
        weeklyHours={7}
      />,
    );
    expect(screen.getByRole("img", { name: "1 of 3 goals done" })).toBeInTheDocument();
    expect(screen.getByText(/of 3/)).toBeInTheDocument();
    const month = period.start.toLocaleDateString(undefined, { month: "long" });
    expect(screen.getByText(`${month} progress`)).toBeInTheDocument();
    expect(screen.getByText(/left across 2 goals/)).toHaveTextContent(
      "About 6h left across 2 goals. You average 7h a week, so this will be tight.",
    );
  });

  it("omits the weekly average when there is no play data", () => {
    render(
      <GoalsProgress timeframe="month" goals={[goal("a")]} period={period} now={now} weeklyHours={null} />,
    );
    expect(screen.getByText(/left across 1 goal\./)).toBeInTheDocument();
    expect(screen.queryByText(/You average/)).not.toBeInTheDocument();
  });

  it("invites accepting a suggestion when the list is empty", () => {
    render(<GoalsProgress timeframe="week" goals={[]} period={period} now={now} weeklyHours={7} />);
    expect(screen.getByText("Accept a suggestion below to start your list.")).toBeInTheDocument();
  });
});
