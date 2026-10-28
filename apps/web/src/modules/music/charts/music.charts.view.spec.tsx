import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type {
  MusicBreakdownResponse,
  MusicMoversResponse,
  MusicTopsResponse,
} from "@questorylabs/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { MusicChartsView } from "./music.charts.view";
import type { MusicChartsViewProps } from "./music.charts.types";

const idleBreakdown = mockResource<MusicBreakdownResponse>({
  empty: false,
  failed: false,
  value: { periodListens: 0, items: [] },
});

const tops: MusicTopsResponse = {
  periodListens: 10,
  total: 1,
  page: 1,
  pageSize: 15,
  items: [{ id: "a1", name: "Flume", count: 10 }],
};

const moversData: MusicMoversResponse = {
  kind: "artists",
  range: "week",
  periodListens: 10,
  previousListens: 8,
  concentration: { topN: 10, share: 58, previousShare: 49, delta: 9 },
  movers: [
    {
      id: "a4",
      name: "Bonobo",
      count: 6,
      previousCount: 1,
      rank: 2,
      previousRank: 13,
      delta: 11,
      isNew: false,
    },
    {
      id: "a9",
      name: "Kiasmos",
      count: 3,
      previousCount: 0,
      rank: 4,
      previousRank: null,
      delta: null,
      isNew: true,
    },
    {
      id: "a2",
      name: "Tycho",
      count: 2,
      previousCount: 5,
      rank: 5,
      previousRank: 2,
      delta: -3,
      isNew: false,
    },
  ],
};

const renderView = (patch: Partial<MusicChartsViewProps> = {}) =>
  render(
    <MusicChartsView
      {...({
        kind: "artists",
        setKind: () => {},
        range: "week",
        onRangeChange: () => {},
        page: 1,
        setPage: () => {},
        tops: mockResource({ empty: false, failed: false, value: tops }),
        movers: mockResource({ empty: false, failed: false, value: moversData }),
        years: idleBreakdown,
        services: idleBreakdown,
        ...patch,
      } as MusicChartsViewProps)}
    />,
  );

describe("MusicChartsView", () => {
  afterEach(cleanup);

  it("shows an error when tops failed", () => {
    renderView({
      tops: mockResource({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load charts.")).toBeInTheDocument();
  });

  it("shows collection empty when ready with no items", () => {
    renderView({
      tops: mockResource({
        empty: false,
        failed: false,
        value: { periodListens: 0, total: 0, page: 1, pageSize: 15, items: [] },
      }),
    });
    expect(screen.getByText("No listens in this range.")).toBeInTheDocument();
  });

  it("renders chart rows when ready", () => {
    renderView();
    expect(screen.getAllByText("Flume").length).toBeGreaterThan(0);
  });
  it("renders the ranked headline and switches tabs", () => {
    const setKind = vi.fn();
    renderView({ setKind });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "10 listens, ranked",
    );
    expect(screen.getByRole("tab", { name: "Artists" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByRole("tab", { name: "Albums" }));
    expect(setKind).toHaveBeenCalledWith("albums");
  });

  it("shows concentration and movers", () => {
    renderView();
    expect(
      screen.getByText(
        "Your top 10 artists make up 58% of listens, up from 49% last week.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bonobo" })).toHaveAttribute(
      "href",
      "/music/artists/a4",
    );
    expect(screen.getByText("▲ 11")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("▼ 3")).toBeInTheDocument();
  });

  it("shows a movers error without hiding the chart", () => {
    renderView({ movers: mockResource({ empty: true, failed: true }) });
    expect(screen.getByText("Could not load movers.")).toBeInTheDocument();
    expect(screen.getAllByText("Flume").length).toBeGreaterThan(0);
  });

  it("keeps release years and sources panels", () => {
    renderView();
    expect(screen.getByText("Release years")).toBeInTheDocument();
    expect(screen.getByText("Sources")).toBeInTheDocument();
  });
});
