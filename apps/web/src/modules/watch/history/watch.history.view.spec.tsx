import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { mockResource } from "@/test/resource-mock";
import { WatchHistoryView } from "./watch.history.view";

const event = {
  id: "e1",
  watchedAt: "2026-08-01T20:00:00.000Z",
  source: "trakt",
  precision: "exact",
  rating: 4,
  progress: 100,
  title: { id: "t1", name: "Severance", type: "show", posterUrl: null },
  episode: { seasonNumber: 1, episodeNumber: 2 },
};

const renderView = (over: Record<string, unknown> = {}) =>
  render(
    <ResourceProvider store={new ResourceStore({ retries: false })}>
      <WatchHistoryView
        {...{
          recent: mockResource({ empty: false, failed: false, value: { items: [event], total: 1, page: 1, pageSize: 20 } }),
          page: 1,
          setPage: vi.fn(),
          type: "all",
          setType: vi.fn(),
          query: "",
          setQuery: vi.fn(),
          ...over,
        }}
      />
    </ResourceProvider>,
  );

describe("WatchHistoryView", () => {
  afterEach(cleanup);

  it("renders rows with episode titles and search", () => {
    const setQuery = vi.fn();
    renderView({ setQuery });
    expect(screen.getByRole("link", { name: "Severance · S1 E2" })).toHaveAttribute("href", "/watch/titles/t1");
    expect(screen.getByRole("region", { name: "Watch history" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search history" }), { target: { value: "sev" } });
    expect(setQuery).toHaveBeenCalledWith("sev");
  });

  it("shows the filtered empty state and errors", () => {
    renderView({
      query: "zzz",
      recent: mockResource({ empty: false, failed: false, value: { items: [], total: 0, page: 1, pageSize: 20 } }),
    });
    expect(screen.getByText("Nothing matches")).toBeInTheDocument();
    cleanup();
    renderView({ recent: mockResource({ empty: true, failed: true }) });
    expect(screen.getByText("Could not load watch history.")).toBeInTheDocument();
  });
});
