import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MusicBreakdownResponse, MusicMoversResponse } from "@questorylabs/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { ChartBreakdowns } from "./ChartBreakdowns";
import { ChartInsights } from "./ChartInsights";
import { ChartRows } from "./ChartRows";
import { ChartTabs } from "./ChartTabs";

const breakdown = (label: string): MusicBreakdownResponse => ({
  periodListens: 10,
  items: [{ key: label, label, count: 4 }],
});

describe("music chart components", () => {
  afterEach(cleanup);

  it("switches tabs", () => {
    const onChange = vi.fn();
    render(<ChartTabs kind="tracks" onChange={onChange} />);
    expect(screen.getByRole("tab", { name: "Tracks" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Moods" }));
    expect(onChange).toHaveBeenCalledWith("moods");
  });

  it("ranks rows with offsets, links and shares", () => {
    render(
      <ChartRows
        kind="tracks"
        rankOffset={15}
        periodListens={40}
        items={[{ id: "t1", title: "Helix", artistName: "Ayla", count: 10 }]}
      />,
    );
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Helix" })).toHaveAttribute(
      "href",
      "/music/tracks/t1",
    );
    expect(screen.getByText("Ayla")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("renders unlinked genre rows", () => {
    render(
      <ChartRows
        kind="genres"
        rankOffset={0}
        periodListens={10}
        items={[{ id: "g1", name: "ambient", count: 5 }]}
      />,
    );
    expect(screen.getByText("ambient")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("explains movers when no previous period exists", () => {
    const data: MusicMoversResponse = {
      kind: "albums",
      range: "all",
      periodListens: 10,
      previousListens: 0,
      concentration: { topN: 10, share: 70, previousShare: null, delta: null },
      movers: [],
    };
    render(
      <ChartInsights
        kind="albums"
        range="all"
        movers={mockResource({ empty: false, failed: false, value: data })}
      />,
    );
    expect(screen.getByText("Your top 10 albums make up 70% of listens.")).toBeInTheDocument();
    expect(screen.getByText("Movers need a comparable period.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Top 10 share 70%" })).toBeInTheDocument();
  });

  it("renders breakdown panels and their errors", () => {
    render(
      <ChartBreakdowns
        years={mockResource({ empty: false, failed: false, value: breakdown("2019") })}
        services={mockResource({ empty: true, failed: true })}
      />,
    );
    expect(screen.getByText("2019")).toBeInTheDocument();
    expect(screen.getByText("4 · 40%")).toBeInTheDocument();
    expect(screen.getByText("Could not load sources.")).toBeInTheDocument();
  });
});
