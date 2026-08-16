import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { ReadInsights } from "@questorylabs/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/read", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/read")>();
  return { ...actual, readFetch: vi.fn() };
});

import { readFetch } from "@/lib/read";
import { ReadHomeView } from "./ReadHomeView";

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

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

describe("ReadHomeView", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(readFetch).mockReset();
    vi.mocked(readFetch).mockImplementation(async (path) => {
      if (String(path).includes("/analytics/insights")) return insights;
      if (String(path).includes("/analytics/timeseries")) return [];
      return { periodEvents: 4, items: [] };
    });
  });

  it("loads all-time analytics without a date range picker", async () => {
    wrap(<ReadHomeView />);

    expect(await screen.findByRole("heading", { name: "Read" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Day" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Week" })).not.toBeInTheDocument();
    expect(readFetch).toHaveBeenCalledWith(
      expect.stringContaining("/analytics/insights?range=all"),
    );
  });
});
