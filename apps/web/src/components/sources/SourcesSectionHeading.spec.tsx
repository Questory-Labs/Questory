import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SourcesSectionHeading } from "./SourcesSectionHeading";

describe("SourcesSectionHeading", () => {
  afterEach(cleanup);

  it("renders eyebrow, a level two title and description", () => {
    render(<SourcesSectionHeading eyebrow="Live" title="Live sources" description="Active connections." />);
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Live sources" })).toBeInTheDocument();
    expect(screen.getByText("Active connections.")).toBeInTheDocument();
  });

  it("renders the action when provided", () => {
    render(
      <SourcesSectionHeading
        eyebrow="Live"
        title="Live sources"
        description="Active connections."
        action={<button type="button">Add source</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Add source" })).toBeInTheDocument();
  });

  it("renders no controls without an action", () => {
    render(<SourcesSectionHeading eyebrow="Live" title="Live sources" description="Active connections." />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("treats a null action as absent", () => {
    render(<SourcesSectionHeading eyebrow="E" title="T" description="D" action={null} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("heading", { name: "T" })).toBeInTheDocument();
  });
});
