import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { WatchContinueResponse, WatchInsights, WatchTitleDetail, WatchTitleSeason } from "@questorylabs/shared";
import { mockResource } from "@/test/resource-mock";
import { ContinueWatching } from "./home/components/ContinueWatching";
import { WatchCharts } from "./home/components/WatchCharts";
import { WatchKpis } from "./home/components/WatchKpis";
import { SeasonEpisodes } from "./title/components/SeasonEpisodes";
import { WatchTitleTimeline } from "./title/components/WatchTitleTimeline";

const insights = {
  periodWatches: 4,
  watchingMinutes: 120,
  runtimeCoverage: 80,
  newTitles: 1,
  uniqueTitles: 2,
  movieWatches: 3,
  showWatches: 1,
  movieMinutes: 90,
  showMinutes: 30,
  peakHour: null,
  compare: { previousWatches: 2, deltaPct: 100, previousWatchingMinutes: 60, watchingMinutesDeltaPct: 100 },
} as unknown as WatchInsights;

const season = (seasonNumber: number, watched: number[]) =>
  ({
    seasonNumber,
    name: null,
    episodeCount: 3,
    watchedEpisodes: watched.length,
    episodes: [1, 2, 3].map((n) => ({ episodeNumber: n, name: `Ep ${n}`, watchCount: watched.includes(n) ? 1 : 0 })),
  }) as unknown as WatchTitleSeason;

describe("watch components", () => {
  afterEach(cleanup);

  it("ContinueWatching links titles, hides when empty, and reports errors", () => {
    const res = (items: unknown[]) =>
      mockResource<WatchContinueResponse>({ empty: false, failed: false, value: { items } as WatchContinueResponse });
    const item = {
      anime: false,
      watchedEpisodes: 2,
      next: { seasonNumber: 1, episodeNumber: 3 },
      title: { id: "t1", name: "Severance", displayName: null, posterUrl: null, totalEpisodes: 9 },
    };
    const { container, rerender } = render(<ContinueWatching continuing={res([item])} />);
    expect(screen.getByRole("link", { name: /Severance/ })).toHaveAttribute("href", "/watch/titles/t1");
    rerender(<ContinueWatching continuing={res([])} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ContinueWatching continuing={mockResource<WatchContinueResponse>({ empty: true, failed: true })} />);
    expect(screen.getByText("Could not load continue watching.")).toBeInTheDocument();
  });

  it("WatchKpis shows the hours delta and the movie/TV split", () => {
    render(<WatchKpis d={insights} media="all" />);
    expect(screen.getByText("+1h vs prior 30 days")).toBeInTheDocument();
    expect(screen.getByText("Movies")).toBeInTheDocument();
    expect(screen.getByText("TV")).toBeInTheDocument();
    cleanup();
    render(<WatchKpis d={insights} media="movie" />);
    expect(screen.queryByText("Movies")).toBeNull();
  });

  it("WatchCharts surfaces per-chart errors", () => {
    const failed = mockResource({ empty: true, failed: true }) as never;
    render(
      <WatchCharts
        insights={mockResource({ empty: false, failed: false, value: insights })}
        hour={failed}
        dow={failed}
        years={failed}
        sources={failed}
        tops={failed}
      />,
    );
    expect(screen.getByText("Could not load day-of-week watches.")).toBeInTheDocument();
    expect(screen.getByText("Could not load top titles.")).toBeInTheDocument();
    expect(screen.getByText("Could not load watch sources.")).toBeInTheDocument();
    expect(screen.getByText("Could not load hour-of-day watches.")).toBeInTheDocument();
    expect(screen.getByText("Could not load release years.")).toBeInTheDocument();
  });

  it("SeasonEpisodes defaults to the next unwatched season and switches", () => {
    render(<SeasonEpisodes seasons={[season(1, [1, 2, 3]), season(2, [1])]} />);
    expect(screen.getByText("1 / 3 watched")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Watched" })).toHaveLength(1);
    fireEvent.change(screen.getByRole("combobox", { name: "Season" }), { target: { value: "1" } });
    expect(screen.getByText("3 / 3 watched")).toBeInTheDocument();
  });

  it("WatchTitleTimeline lists recent events", () => {
    const d = {
      recentEvents: [{ id: "e1", watchedAt: "2026-08-01T20:00:00.000Z", source: "trakt", rating: 4, episode: null }],
    } as unknown as WatchTitleDetail;
    render(<WatchTitleTimeline d={d} />);
    expect(screen.getByRole("heading", { name: "Your history" })).toBeInTheDocument();
    expect(screen.getAllByText(/Trakt/).length).toBeGreaterThan(0);
  });
});
