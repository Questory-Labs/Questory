import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AgentProgress } from "./AgentProgress";
import type { CurationJob } from "@/lib/enterprise-types";

const job: CurationJob = {
  jobId: "j1",
  status: "extras",
  events: [
    { ts: 1, stage: "scoring", message: "Scoring your libraries" },
    { ts: 2, stage: "extras", message: "Looking for extras" },
    { ts: 3, stage: "extras", message: "Added a few extra picks" },
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
      "Scoring your libraries",
      "Looking for extras",
      "Added a few extra picks",
    ]);
  });

  it("marks completed and active stages on the stepper", () => {
    render(<AgentProgress job={job} />);
    const step = (label: string) =>
      screen.getByText(label).closest("li") as HTMLElement;
    expect(step("Scoring").dataset.state).toBe("done");
    expect(step("Finding extras").dataset.state).toBe("active");
    expect(step("Writing").dataset.state).toBe("pending");
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
