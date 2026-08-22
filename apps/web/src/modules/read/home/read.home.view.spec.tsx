import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { ReadInsights, ReadTimeBucket } from "@questorylabs/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { ReadHomeView } from "./read.home.view";
import type { ReadHomeViewProps } from "./read.home.types";

vi.mock("@/lib/read", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/read")>();
  return { ...actual, readFetch: vi.fn() };
});

import { readFetch } from "@/lib/read";
import { ReadHomeController } from "./read.home.controller";

const insights: ReadInsights = {
  range: "all",
  format: "all",
  periodEvents: 4,
  peakHour: null,
  peakDow: null,
  topGenre: null,
  chaptersLogged: 12,
  newTitles: 2,
  topTitleShare: 50,
  uniqueTitles: 2,
  formatBreakdown: [],
  statusBreakdown: [],
  sourceBreakdown: [],
  compare: { previousEvents: null, deltaPct: null },
};

const emptyBuckets = mockResource<ReadTimeBucket[]>({
  empty: false,
  failed: false,
  value: [],
});

const emptyBreakdown = mockResource({
  empty: false,
  failed: false,
  value: { periodEvents: 0, items: [] },
});

const renderView = (patch: Partial<ReadHomeViewProps> = {}) =>
  render(
    <ReadHomeView
      {...({
        insights: mockResource({ empty: false, failed: false, value: insights }),
        hour: emptyBuckets,
        dow: emptyBuckets,
        formats: emptyBreakdown,
        sources: emptyBreakdown,
        ...patch,
      } as ReadHomeViewProps)}
    />,
  );

describe("ReadHomeView", () => {
  afterEach(cleanup);

  it("shows an error when insights failed", () => {
    renderView({
      insights: mockResource({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load read analytics."),
    ).toBeInTheDocument();
  });

  it("shows skeletons when insights are empty", () => {
    renderView({
      insights: mockResource({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Events")).not.toBeInTheDocument();
  });

  it("renders stats when ready", () => {
    renderView();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});

describe("ReadHomeController", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(readFetch).mockReset();
    vi.mocked(readFetch).mockImplementation(async (path) => {
      if (String(path).includes("/analytics/insights")) return insights;
      if (String(path).includes("/analytics/timeseries")) return [];
      return { periodEvents: 4, items: [] };
    });
  });

  it("loads all-time analytics without a date range picker", async () => {
    const store = new ResourceStore({ retries: false });
    render(
      <ResourceProvider store={store}>
        <ReadHomeController>
          <ReadHomeView />
        </ReadHomeController>
      </ResourceProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Read" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Day" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Week" })).not.toBeInTheDocument();
    expect(readFetch).toHaveBeenCalledWith(
      expect.stringContaining("/analytics/insights?range=all"),
    );
  });
});
