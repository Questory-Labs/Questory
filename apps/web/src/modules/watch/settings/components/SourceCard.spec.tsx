import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SourceCard } from "./SourceCard";
import { StatusPill } from "./StatusPill";

describe("SourceCard", () => {
  afterEach(cleanup);

  it("renders every slot", () => {
    render(
      <SourceCard
        label="OAuth"
        title="Trakt"
        blurb="Sync history."
        tone="ok"
        status={<StatusPill tone="ok">Connected</StatusPill>}
        action={<a href="/x">Reconnect Trakt</a>}
      >
        <p>extra</p>
      </SourceCard>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Trakt" })).toBeInTheDocument();
    expect(screen.getByText("OAuth")).toBeInTheDocument();
    expect(screen.getByText("Sync history.")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reconnect Trakt" })).toHaveAttribute("href", "/x");
    expect(screen.getByText("extra")).toBeInTheDocument();
  });

  it("renders without action or children", () => {
    render(<SourceCard label="L" title="Plex" blurb="B" status="Setup" />);
    expect(screen.getByText("Setup")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the title initial as a decorative avatar", () => {
    render(<SourceCard label="L" title="plex" blurb="B" status="S" />);
    expect(screen.getByText("P")).toHaveAttribute("aria-hidden", "true");
  });
});
