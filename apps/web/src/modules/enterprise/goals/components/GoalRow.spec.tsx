import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Goal } from "@questorylabs/shared";
import { GoalRow } from "./GoalRow";

const goal = (patch: Partial<Goal> = {}): Goal => ({
  id: "g1",
  domain: "games",
  kind: "game",
  name: "Portal 2",
  targetRef: "game:1",
  targetValue: null,
  progressValue: 0,
  estimatedMinutes: 180,
  timeframe: "month",
  periodStart: "2026-10-01T00:00:00.000Z",
  periodEnd: "2026-11-01T00:00:00.000Z",
  acceptedAt: "2026-10-02T00:00:00.000Z",
  doneAt: null,
  createdAt: "2026-10-02T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  ...patch,
});

const renderRow = (g: Goal) => {
  const onToggle = vi.fn();
  const onRemove = vi.fn();
  render(
    <ol>
      <GoalRow goal={g} index={0} reason="68% through" busy={false} onToggle={onToggle} onRemove={onRemove} />
    </ol>,
  );
  return { onToggle, onRemove };
};

describe("GoalRow", () => {
  afterEach(cleanup);

  it("shows the kind label, estimate and reason, and checks off", () => {
    const { onToggle, onRemove } = renderRow(goal());
    expect(screen.getByText("Finish")).toBeInTheDocument();
    expect(screen.getByText("~3h")).toBeInTheDocument();
    expect(screen.getByText("68% through")).toBeInTheDocument();
    const check = screen.getByRole("checkbox", { name: "Mark Portal 2 done" });
    expect(check).toHaveAttribute("aria-checked", "false");
    fireEvent.click(check);
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: "g1" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Portal 2" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("offers undo once done", () => {
    const { onToggle } = renderRow(goal({ doneAt: "2026-10-05T00:00:00.000Z" }));
    expect(screen.getByRole("checkbox", { name: "Mark Portal 2 not done" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Remove Portal 2" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onToggle).toHaveBeenCalled();
  });
});
