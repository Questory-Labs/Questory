import { cleanup, render, screen } from "@testing-library/react";
import type { MusicInsights, MusicPlayingNow, MusicTopsResponse } from "@questorylabs/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { DailyPlaysChart } from "./DailyPlaysChart";
import { DotHeatmap } from "./DotHeatmap";
import { HomeKpis } from "./HomeKpis";
import { NowPlayingHero } from "./NowPlayingHero";
import { TopArtistsCard } from "./TopArtistsCard";

const insights: MusicInsights = {
  range: "week",
  periodListens: 120,
  peakHour: null,
  peakDow: null,
  topGenre: { id: "g1", name: "ambient", count: 30 },
  topMood: null,
  listeningMinutes: 480,
  listensWithDuration: 120,
  durationCoverage: 96,
  newArtists: 4,
  newTracks: 9,
  topTrackShare: 10,
  uniqueArtists: 31,
  uniqueTracks: 80,
  serviceBreakdown: [],
  compare: {
    previousListens: 100,
    deltaPct: 20,
    previousMinutes: 600,
    minutesDeltaPct: -20,
  },
  longestStreakDays: 6,
};

describe("music home components", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders KPIs with deltas, streak and genre share", () => {
    render(
      <HomeKpis
        range="week"
        insights={insights}
        overview={{ streakDays: 3 } as never}
        spark={[1, 2, 3]}
      />,
    );
    expect(screen.getByText("+20% on last week")).toHaveClass("text-[var(--ok)]");
    expect(screen.getByText("-20% on last week")).toHaveClass("text-[var(--music)]");
    expect(screen.getByText("4 new")).toBeInTheDocument();
    expect(screen.getByText("ambient")).toBeInTheDocument();
    expect(screen.getByText("25% of plays")).toBeInTheDocument();
    expect(screen.getByText("Longest 6 days in range")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Listens by day" })).toBeInTheDocument();
  });

  it("omits the streak tile without an overview", () => {
    render(<HomeKpis range="all" insights={insights} overview={undefined} spark={[]} />);
    expect(screen.queryByText("Streak")).not.toBeInTheDocument();
  });

  it("renders the now playing hero with a progress scrubber", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T10:01:00.000Z"));
    const playing: NonNullable<MusicPlayingNow> = {
      updatedAt: "2026-10-01T10:00:00.000Z",
      startedAt: "2026-10-01T10:00:00.000Z",
      source: "listenbrainz",
      track: {
        id: "t1",
        title: "Helix",
        artistId: "a1",
        artistName: "Ayla",
        releaseId: "r1",
        releaseTitle: "Spiral",
        imageUrl: null,
        year: 2019,
        durationMs: 240_000,
      },
    };
    render(<NowPlayingHero playing={playing} />);
    expect(screen.getByText(/via ListenBrainz/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Spiral" })).toHaveAttribute(
      "href",
      "/music/albums/r1",
    );
    expect(screen.getByText("1:00")).toBeInTheDocument();
    expect(screen.getByText("4:00")).toBeInTheDocument();
    expect(screen.getByTestId("music-eq")).toBeInTheDocument();
  });

  it("renders the dot heatmap with tooltips and peak caption", () => {
    render(
      <DotHeatmap
        caption="ambient"
        heatmap={{
          dayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          hourLabels: [],
          maxCount: 4,
          cells: [{ day: 4, hour: 22, count: 4 }],
        }}
      />,
    );
    expect(screen.getByText("Fri 22:00 · ambient")).toBeInTheDocument();
    expect(screen.getByTitle("Fri 22:00 · 4 plays")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Listening by weekday and hour, brightest at Fri 22:00" }),
    ).toBeInTheDocument();
  });

  it("renders top artists and their failure state", () => {
    const value: MusicTopsResponse = {
      periodListens: 10,
      total: 1,
      page: 1,
      pageSize: 6,
      items: [{ id: "a1", name: "Ayla", count: 7 }],
    };
    render(<TopArtistsCard tops={mockResource({ empty: false, failed: false, value })} />);
    expect(screen.getByRole("link", { name: /Ayla/ })).toBeInTheDocument();
    cleanup();
    render(<TopArtistsCard tops={mockResource({ empty: true, failed: true })} />);
    expect(screen.getByText("Could not load top artists.")).toBeInTheDocument();
  });

  it("renders the daily line and hides it with too few days", () => {
    const { container } = render(
      <DailyPlaysChart
        target={null}
        buckets={[
          { key: "2026-10-01", label: "a", count: 3 },
          { key: "2026-10-02", label: "b", count: 5 },
        ]}
      />,
    );
    expect(screen.getByText("Daily plays")).toBeInTheDocument();
    expect(screen.queryByText(/Target/)).not.toBeInTheDocument();
    expect(container.querySelectorAll("circle")).toHaveLength(2);
    cleanup();
    const { container: none } = render(
      <DailyPlaysChart target={5} buckets={[{ key: "2026-10-01", label: "a", count: 3 }]} />,
    );
    expect(none).toBeEmptyDOMElement();
  });
});
