import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { WatchInsights } from "@questorylabs/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/watch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch")>();
  return { ...actual, watchFetch: vi.fn() };
});

import { watchFetch } from "@/lib/watch";
import { WatchHomeView } from "./WatchHomeView";

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

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

describe("WatchHomeView", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(watchFetch).mockReset();
    vi.mocked(watchFetch).mockImplementation(async (path) => {
      if (String(path).includes("/analytics/insights")) return insights;
      if (String(path).includes("/analytics/timeseries")) return [];
      return { periodWatches: 4, items: [] };
    });
  });

  it("loads all-time analytics without a date range picker", async () => {
    wrap(<WatchHomeView />);

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
