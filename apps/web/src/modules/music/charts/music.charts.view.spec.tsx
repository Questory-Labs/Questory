import { cleanup, render, screen } from "@testing-library/react";
import type {
  MusicBreakdownResponse,
  MusicTopsResponse,
} from "@questorylabs/shared";
import { afterEach, describe, expect, it } from "vitest";
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
});
