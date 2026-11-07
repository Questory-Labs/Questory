import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MusicSectionHeading, MusicSourceCard, MusicStatusPill } from "./MusicSourceCard";

describe("MusicSourceCard", () => {
  afterEach(cleanup);

  it("renders label, title, blurb, status, action and children", () => {
    render(
      <MusicSourceCard
        label="Scrobbler"
        title="Last.fm"
        blurb="Pulls your scrobbles."
        tone="ok"
        status={<MusicStatusPill tone="ok">Connected</MusicStatusPill>}
        action={<button type="button">Disconnect</button>}
      >
        <p>Account: santa</p>
      </MusicSourceCard>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Last.fm" })).toBeInTheDocument();
    expect(screen.getByText("Scrobbler")).toBeInTheDocument();
    expect(screen.getByText("Pulls your scrobbles.")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
    expect(screen.getByText("Account: santa")).toBeInTheDocument();
  });

  it("omits optional action and children", () => {
    render(<MusicSourceCard label="L" title="Ingest" blurb="B" status="Idle" />);
    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it.each([
    ["ok", "var(--ok)"],
    ["warn", "var(--warn)"],
    ["idle", "var(--faint)"],
  ] as const)("colors the %s status pill", (tone, color) => {
    render(<MusicStatusPill tone={tone}>State</MusicStatusPill>);
    expect(screen.getByText("State").style.color).toBe(color);
  });
});

describe("MusicSectionHeading", () => {
  afterEach(cleanup);

  it("renders eyebrow, level two title and description", () => {
    render(<MusicSectionHeading eyebrow="History" title="Imports" description="Upload an export." />);
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Imports" })).toBeInTheDocument();
    expect(screen.getByText("Upload an export.")).toBeInTheDocument();
  });
});
