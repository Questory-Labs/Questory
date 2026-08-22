import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { WatchTitleDetail } from "@questorylabs/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { WatchTitleView } from "./watch.title.view";
import type { WatchTitleViewProps } from "./watch.title.types";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "title-1" }),
}));

vi.mock("@/lib/watch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch")>();
  return { ...actual, watchFetch: vi.fn() };
});

import { watchFetch } from "@/lib/watch";
import { WatchTitleController } from "./watch.title.controller";

const detail: WatchTitleDetail = {
  range: "all",
  title: {
    id: "title-1",
    name: "Nobody 2",
    displayName: null,
    type: "movie",
    year: 2025,
    overview: "A sequel.",
    posterUrl: null,
    genres: ["Action"],
  },
  eventCount: 2,
  firstWatchAt: "2026-01-02T20:00:00.000Z",
  latestWatchAt: "2026-08-01T20:00:00.000Z",
  userRating: 3,
  topEpisodes: [],
  recentEvents: [
    {
      id: "e2",
      watchedAt: "2026-08-01T20:00:00.000Z",
      source: "trakt",
      rating: 3,
      episode: null,
    },
    {
      id: "e1",
      watchedAt: "2026-01-02T20:00:00.000Z",
      source: "letterboxd",
      rating: null,
      episode: null,
    },
  ],
};

const renderView = (patch: Partial<WatchTitleViewProps> = {}) =>
  render(
    <WatchTitleView
      {...({
        id: "title-1",
        detail: mockResource({ empty: false, failed: false, value: detail }),
        saveBusy: false,
        onSave: async () => {},
        ...patch,
      } as WatchTitleViewProps)}
    />,
  );

describe("WatchTitleView", () => {
  afterEach(cleanup);

  it("shows an error when the title failed", () => {
    renderView({
      detail: mockResource({ empty: true, failed: true }),
    });
    expect(screen.getByText("Title not found.")).toBeInTheDocument();
  });

  it("renders history when ready", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Nobody 2" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByText(/2 watches · first/)).toBeInTheDocument();
    expect(screen.getByText(/trakt/)).toBeInTheDocument();
    expect(screen.getByText(/letterboxd/)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Time range" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Day" })).not.toBeInTheDocument();
  });
});

describe("WatchTitleController", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(watchFetch).mockReset();
    vi.mocked(watchFetch).mockResolvedValue(detail);
  });

  it("loads all-time history without a date range picker", async () => {
    const store = new ResourceStore({ retries: false });
    render(
      <ResourceProvider store={store}>
        <WatchTitleController>
          <WatchTitleView />
        </WatchTitleController>
      </ResourceProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Nobody 2" })).toBeInTheDocument();
    expect(watchFetch).toHaveBeenCalledWith("/analytics/titles/title-1");
  });
});
