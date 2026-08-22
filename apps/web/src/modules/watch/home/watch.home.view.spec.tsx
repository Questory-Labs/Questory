import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { WatchInsights, WatchTimeBucket } from "@questorylabs/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { WatchHomeView } from "./watch.home.view";
import type { WatchHomeViewProps } from "./watch.home.types";

vi.mock("@/lib/watch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch")>();
  return { ...actual, watchFetch: vi.fn() };
});

import { watchFetch } from "@/lib/watch";
import { WatchHomeController } from "./watch.home.controller";

const insights: WatchInsights = {
  range: "all",
  type: "all",
  periodWatches: 4,
  peakHour: null,
  peakDow: null,
  topGenre: null,
  watchingMinutes: 120,
  watchesWithRuntime: 4,
  runtimeCoverage: 100,
  newTitles: 2,
  topTitleShare: 50,
  uniqueTitles: 2,
  movieWatches: 3,
  showWatches: 1,
  movieMinutes: 90,
  showMinutes: 30,
  uniqueMovies: 1,
  uniqueShows: 1,
  sourceBreakdown: [],
  compare: { previousWatches: null, deltaPct: null },
};

const emptyBuckets = mockResource<WatchTimeBucket[]>({
  empty: false,
  failed: false,
  value: [],
});

const emptyBreakdown = mockResource({
  empty: false,
  failed: false,
  value: { periodWatches: 0, items: [] },
});

const wrap = (ui: React.ReactNode) => {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
};

const renderView = (patch: Partial<WatchHomeViewProps> = {}) =>
  wrap(
    <WatchHomeView
      {...({
        media: "all",
        setMedia: () => {},
        insights: mockResource({ empty: false, failed: false, value: insights }),
        hour: emptyBuckets,
        dow: emptyBuckets,
        years: emptyBreakdown,
        sources: emptyBreakdown,
        ...patch,
      } as WatchHomeViewProps)}
    />,
  );

describe("WatchHomeView", () => {
  afterEach(cleanup);

  it("shows an error when insights failed", () => {
    renderView({
      insights: mockResource({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load watch analytics."),
    ).toBeInTheDocument();
  });

  it("shows skeletons when insights are empty", () => {
    renderView({
      insights: mockResource({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Watches")).not.toBeInTheDocument();
  });

  it("renders stats when ready", () => {
    renderView();
    expect(screen.getByText("Watching time")).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
  });
});

describe("WatchHomeController", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(watchFetch).mockReset();
    vi.mocked(watchFetch).mockImplementation(async (path) => {
      if (String(path).includes("/analytics/insights")) return insights;
      if (String(path).includes("/analytics/timeseries")) return [];
      return { periodWatches: 4, items: [] };
    });
  });

  it("loads all-time analytics without a date range picker", async () => {
    const store = new ResourceStore({ retries: false });
    render(
      <ResourceProvider store={store}>
        <WatchHomeController>
          <WatchHomeView />
        </WatchHomeController>
      </ResourceProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Watch" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Media type" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Time range" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Day" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Week" })).not.toBeInTheDocument();
    expect(watchFetch).toHaveBeenCalledWith(
      expect.stringContaining("/analytics/insights?range=all"),
    );
  });
});
