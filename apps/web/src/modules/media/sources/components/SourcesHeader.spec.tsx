import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { SourcesOverview } from "@questorylabs/shared";
import { SourcesFlash } from "./SourcesFlash";
import { SourcesHeader } from "./SourcesHeader";

const tabs = [
  { value: "music" as const, label: "Music" },
  { value: "watch" as const, label: "Watch" },
  { value: "read" as const, label: "Read" },
];

describe("SourcesHeader", () => {
  afterEach(cleanup);

  it.each([
    ["music", "listening"],
    ["watch", "watching"],
    ["read", "reading"],
  ] as const)("names the %s domain", (tab, noun) => {
    render(<SourcesHeader tabs={tabs} tab={tab} onTabChange={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`Where your ${noun} comes from`);
  });

  it("hides the summary until the overview loads", () => {
    render(<SourcesHeader tabs={tabs} tab="music" onTabChange={vi.fn()} />);
    expect(screen.queryByText(/connected/)).toBeNull();
  });

  it("summarises an empty overview with zero and no tab counts", () => {
    const overview: SourcesOverview = { connected: 0, domains: [] };
    render(<SourcesHeader tabs={tabs} tab="music" overview={overview} onTabChange={vi.fn()} />);
    expect(screen.getByText(/0 connected · music, watch, read/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Music" })).toBeInTheDocument();
  });

  it("shows a zero count for a domain with nothing connected", () => {
    const overview = {
      connected: 0,
      domains: [{ domain: "watch", connected: 0, providers: [] }],
    } as unknown as SourcesOverview;
    render(<SourcesHeader tabs={tabs} tab="music" overview={overview} onTabChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /Watch/ })).toHaveTextContent("Watch0");
  });

  it("marks only the active tab as selected", () => {
    render(<SourcesHeader tabs={tabs} tab="read" onTabChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: "Read" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Music" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Watch" })).toHaveAttribute("aria-selected", "false");
  });

  it("omits the tablist for a single tab", () => {
    render(<SourcesHeader tabs={[tabs[1]]} tab="watch" onTabChange={vi.fn()} />);
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});

describe("SourcesFlash", () => {
  afterEach(cleanup);

  it("renders nothing without messages", () => {
    const { container } = render(<SourcesFlash messages={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("announces multiple failures separately", () => {
    render(
      <SourcesFlash
        messages={[
          { provider: "mal", ok: false, text: "Could not connect MyAnimeList." },
          { provider: "trakt", ok: false, text: "Could not connect Trakt." },
        ]}
      />,
    );
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([
      "Could not connect MyAnimeList.",
      "Could not connect Trakt.",
    ]);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders provider text inertly", () => {
    render(<SourcesFlash messages={[{ provider: "mal", ok: false, text: "<img src=x onerror=alert(1)>" }]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("<img src=x onerror=alert(1)>");
    expect(screen.queryByRole("img")).toBeNull();
  });
});
