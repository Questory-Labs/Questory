import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LoadingPage } from "./LoadingPage";
import { taglinePool } from "@/lib/status-taglines";

describe("LoadingPage", () => {
  it("renders loading status and quest-log copy", () => {
    render(
      <LoadingPage
        layout="embedded"
        title="Syncing your quest log"
        logLine="quest log › hydrate — status: in_progress"
      />,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Syncing your quest log" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("quest log › hydrate — status: in_progress"),
    ).toBeInTheDocument();
  });

  it("shows a rotating loading tagline when no description is given", () => {
    const { container } = render(<LoadingPage layout="embedded" />);

    const sources = taglinePool("loading").map((t) => `— ${t.source}`);
    const scoped = within(container as HTMLElement);
    expect(sources.some((s) => scoped.queryByText(s) !== null)).toBe(true);
  });

  it("prefers an explicit description over the tagline", () => {
    const { container } = render(
      <LoadingPage layout="embedded" description="Fixed copy" />,
    );

    const scoped = within(container as HTMLElement);
    expect(scoped.getByText("Fixed copy")).toBeInTheDocument();
    const sources = taglinePool("loading").map((t) => `— ${t.source}`);
    expect(sources.some((s) => scoped.queryByText(s) !== null)).toBe(false);
  });
});
