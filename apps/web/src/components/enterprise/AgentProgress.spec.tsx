import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AgentProgress } from "./AgentProgress";
import type { CurationJob } from "@/lib/enterprise-types";

const job: CurationJob = {
  jobId: "j1",
  status: "ranking",
  events: [
    { ts: 1, stage: "scout", message: "searching web for “cozy roguelikes”" },
    { ts: 2, stage: "scout", message: "scouted Dungeon Clawler" },
    { ts: 3, stage: "ranker", message: "reading games stats" },
  ],
};

describe("AgentProgress", () => {
  afterEach(cleanup);

  it("renders the live activity feed in order", () => {
    render(<AgentProgress job={job} />);
    const log = screen.getByRole("log");
    const lines = Array.from(log.querySelectorAll("p")).map(
      (p) => p.textContent,
    );
    expect(lines).toEqual([
      "scoutsearching web for “cozy roguelikes”",
      "scoutscouted Dungeon Clawler",
      "rankerreading games stats",
    ]);
  });

  it("marks completed and active stages on the stepper", () => {
    render(<AgentProgress job={job} />);
    const step = (label: string) =>
      screen.getByText(label).closest("li") as HTMLElement;
    expect(step("Scouting").dataset.state).toBe("done");
    expect(step("Ranking").dataset.state).toBe("active");
    expect(step("Validating").dataset.state).toBe("pending");
    expect(step("Composing").dataset.state).toBe("pending");
  });

  it("offers the heuristics escape hatch", () => {
    const onShowHeuristics = vi.fn();
    render(<AgentProgress job={job} onShowHeuristics={onShowHeuristics} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Show quick picks while I wait" }),
    );
    expect(onShowHeuristics).toHaveBeenCalled();
  });
});
