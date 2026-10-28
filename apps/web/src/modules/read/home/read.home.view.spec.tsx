import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { ReadInsights, ReadTimeBucket } from "@questorylabs/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { ReadHomeView } from "./read.home.view";
import type { ReadHomeViewProps } from "./read.home.types";

vi.mock("@/lib/api", () => ({
  api: vi.fn().mockResolvedValue({ connected: 0, domains: [] }),
}));

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

const emptyLibrary = mockResource({
  empty: false,
  failed: false,
  value: { items: [], total: 0, page: 1, pageSize: 6 },
});

const renderView = (patch: Partial<ReadHomeViewProps> = {}) =>
  render(
    <ReadHomeView
      {...({
        range: "month",
        setRange: () => {},
        reading: emptyLibrary,
        overview: mockResource({ empty: true, failed: false }),
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
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/12\s*chapters/);
  });

  it("changes the range from the picker", () => {
    const setRange = vi.fn();
    renderView({ setRange });
    fireEvent.click(screen.getByRole("button", { name: "7d" }));
    expect(setRange).toHaveBeenCalledWith("week");
  });
});

describe("ReadHomeController", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(readFetch).mockReset();
    vi.mocked(readFetch).mockImplementation(async (path) => {
      if (String(path).includes("/analytics/insights")) return insights;
      if (String(path).includes("/analytics/timeseries")) return [];
      if (String(path).startsWith("/library")) return { items: [], total: 0, page: 1, pageSize: 6 };
      return { periodEvents: 4, items: [] };
    });
  });

  it("loads the last 30 days with a range picker", async () => {
    const store = new ResourceStore({ retries: false });
    render(
      <ResourceProvider store={store}>
        <ReadHomeController>
          <ReadHomeView />
        </ReadHomeController>
      </ResourceProvider>,
    );

    expect(await screen.findByRole("heading", { name: /12\s*chapters/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Range" })).toBeInTheDocument();
    expect(readFetch).toHaveBeenCalledWith(
      expect.stringContaining("/analytics/insights?range=month"),
    );
    expect(readFetch).toHaveBeenCalledWith(expect.stringContaining("/library?status=reading"));
  });
});
