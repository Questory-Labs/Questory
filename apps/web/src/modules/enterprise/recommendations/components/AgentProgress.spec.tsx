import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AgentProgress } from "./AgentProgress";
import type { CurationJob, JobStage } from "@/lib/enterprise-types";

const mixStages: JobStage[] = [
  { id: "scoring", label: "Scoring", hint: "Scoring your libraries…" },
  { id: "extras", label: "Finding extras", hint: "Finding extras…" },
  { id: "writing", label: "Writing", hint: "Writing…" },
];

const researchStages: JobStage[] = [
  { id: "scoring", label: "Scoring", hint: "Scoring your libraries…" },
  { id: "researching", label: "Researching", hint: "Searching catalogs…" },
  { id: "writing", label: "Writing", hint: "Writing…" },
];

const job: CurationJob = {
  jobId: "j1",
  status: "extras",
  stages: mixStages,
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

  it("marks completed and active stages from the job payload", () => {
    render(<AgentProgress job={job} />);
    const step = (label: string) =>
      screen.getByText(label).closest("li") as HTMLElement;
    expect(step("Scoring").dataset.state).toBe("done");
    expect(step("Finding extras").dataset.state).toBe("active");
    expect(step("Writing").dataset.state).toBe("pending");
  });

  it("renders the researching stepper the API sent", () => {
    const researchJob: CurationJob = {
      jobId: "j2",
      status: "researching",
      stages: researchStages,
      events: [{ ts: 1, stage: "brief", message: "Reading your taste" }],
    };
    render(<AgentProgress job={researchJob} />);
    const step = (label: string) =>
      screen.getByText(label).closest("li") as HTMLElement;
    expect(step("Scoring").dataset.state).toBe("done");
    expect(step("Researching").dataset.state).toBe("active");
    expect(screen.queryByText("Finding extras")).not.toBeInTheDocument();
  });

  it("shows the current stage hint when the feed is empty", () => {
    const empty: CurationJob = {
      jobId: "j1",
      status: "scoring",
      stages: mixStages,
      events: [],
    };
    const cases: [CurationJob["status"], string][] = [
      ["queued", "Getting ready…"],
      ["scoring", "Scoring your libraries…"],
      ["extras", "Finding extras…"],
      ["researching", "Searching catalogs…"],
      ["writing", "Writing…"],
    ];
    for (const [status, message] of cases) {
      const stages =
        status === "queued"
          ? [{ id: "scoring", label: "Scoring", hint: "Getting ready…" }]
          : status === "researching"
            ? researchStages
            : mixStages;
      render(<AgentProgress job={{ ...empty, status, stages }} />);
      expect(screen.getByRole("log")).toHaveTextContent(message);
      cleanup();
    }
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
