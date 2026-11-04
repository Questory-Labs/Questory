import { cleanup, render, screen } from "@testing-library/react";
import type {
  MusicBreakdownResponse,
  MusicHeatmap,
  MusicInsights,
  MusicOverview,
  MusicPlayingNow,
  MusicTimeBucket,
  MusicTopsResponse,
} from "@questorylabs/shared";
import { afterEach, describe, expect, it } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { MusicHomeView } from "./music.home.view";
import type { MusicHomeViewProps } from "./music.home.types";

const insights: MusicInsights = {
  range: "week",
  periodListens: 9,
  peakHour: null,
  peakDow: null,
  topGenre: null,
  topMood: null,
  listeningMinutes: 40,
  listensWithDuration: 9,
  durationCoverage: 100,
  newArtists: 1,
  newTracks: 2,
  topTrackShare: 20,
  uniqueArtists: 3,
  uniqueTracks: 4,
  serviceBreakdown: [],
  compare: { previousListens: null, deltaPct: null },
};

const idleSeries = mockResource<MusicTimeBucket[]>({
  empty: false,
  failed: false,
  value: [],
});
const idleHeatmap = mockResource<MusicHeatmap>({
  empty: false,
  failed: false,
  value: { cells: [], dayLabels: [], hourLabels: [], maxCount: 0 },
});
const idleBreakdown = mockResource<MusicBreakdownResponse>({
  empty: false,
  failed: false,
  value: { periodListens: 0, items: [] },
});
const idlePlaying = mockResource<MusicPlayingNow>({
  empty: false,
  failed: false,
  value: null,
});

const idleOverview = mockResource<MusicOverview>({ empty: true, failed: false });
const idleTops = mockResource<MusicTopsResponse>({
  empty: false,
  failed: false,
  value: { periodListens: 0, total: 0, page: 1, pageSize: 6, items: [] },
});
const noTarget = mockResource<{ target: number | null }>({
  empty: false,
  failed: false,
  value: { target: null },
});

const renderView = (patch: Partial<MusicHomeViewProps> = {}) =>
  render(
    <MusicHomeView
      {...({
        range: "week",
        setRange: () => {},
        insights: mockResource({ empty: false, failed: false, value: insights }),
        playing: idlePlaying,
        overview: idleOverview,
        topArtists: idleTops,
        dailyTarget: noTarget,
        heatmap: idleHeatmap,
        daySeries: idleSeries,
        hour: idleSeries,
        dow: idleSeries,
        years: idleBreakdown,
        services: idleBreakdown,
        showCalendar: false,
        ...patch,
      } as MusicHomeViewProps)}
    />,
  );

describe("MusicHomeView", () => {
  afterEach(cleanup);

  it("shows an error when insights failed", () => {
    renderView({
      insights: mockResource({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load music analytics."),
    ).toBeInTheDocument();
  });

  it("shows skeletons when insights are empty", () => {
    renderView({
      insights: mockResource({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Listens")).not.toBeInTheDocument();
  });

  it("renders stats when ready", () => {
    renderView();
    expect(screen.getByText("Listens")).toBeInTheDocument();
    expect(screen.getAllByText("9").length).toBeGreaterThan(0);
    expect(screen.getByText("Coverage")).toBeInTheDocument();
    expect(screen.getByText("100.0")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Duration coverage" })).not.toBeInTheDocument();
  });
  it("renders the headline from the peak hour", () => {
    renderView({
      insights: mockResource({
        empty: false,
        failed: false,
        value: { ...insights, peakHour: { hour: 23, label: "11pm", count: 4 } },
      }),
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "9 plays, mostly after dark",
    );
    expect(screen.getByText("Music · This week")).toBeInTheDocument();
  });

  it("shows the now playing hero with source and year", () => {
    renderView({
      playing: mockResource<MusicPlayingNow>({
        empty: false,
        failed: false,
        value: {
          updatedAt: "2026-10-01T10:00:00.000Z",
          startedAt: null,
          source: "lastfm",
          track: {
            id: "t1",
            title: "Helix",
            artistId: "a1",
            artistName: "Ayla",
            releaseId: null,
            releaseTitle: "Spiral",
            imageUrl: null,
            year: 2019,
            durationMs: 200000,
          },
        } as MusicPlayingNow,
      }),
    });
    expect(screen.getByText(/Now playing · via Last\.fm/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Helix" })).toHaveAttribute(
      "href",
      "/music/tracks/t1",
    );
    expect(screen.getByText(/· 2019/)).toBeInTheDocument();
    expect(screen.getByTestId("music-vinyl")).toBeInTheDocument();
  });

  it("draws the daily target line when a goal exists", () => {
    renderView({
      daySeries: mockResource<MusicTimeBucket[]>({
        empty: false,
        failed: false,
        value: [
          { key: "2026-10-01", label: "Oct 1", count: 2 },
          { key: "2026-10-02", label: "Oct 2", count: 12 },
          { key: "2026-10-03", label: "Oct 3", count: 1 },
        ],
      }),
      dailyTarget: mockResource({ empty: false, failed: false, value: { target: 5 } }),
    });
    expect(screen.getByText("5 / day")).toBeInTheDocument();
    expect(screen.getByText("2 quiet days")).toBeInTheDocument();
  });

  it("lists top artists", () => {
    renderView({
      topArtists: mockResource<MusicTopsResponse>({
        empty: false,
        failed: false,
        value: {
          periodListens: 9,
          total: 1,
          page: 1,
          pageSize: 6,
          items: [{ id: "a1", name: "Ayla", count: 7 }],
        },
      }),
    });
    expect(screen.getByRole("link", { name: /Ayla/ })).toHaveAttribute(
      "href",
      "/music/artists/a1",
    );
  });
});
