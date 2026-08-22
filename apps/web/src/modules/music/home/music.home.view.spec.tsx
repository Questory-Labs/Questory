import { cleanup, render, screen } from "@testing-library/react";
import type {
  MusicBreakdownResponse,
  MusicHeatmap,
  MusicInsights,
  MusicPlayingNow,
  MusicTimeBucket,
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

const renderView = (patch: Partial<MusicHomeViewProps> = {}) =>
  render(
    <MusicHomeView
      {...({
        range: "week",
        setRange: () => {},
        insights: mockResource({ empty: false, failed: false, value: insights }),
        playing: idlePlaying,
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
    expect(screen.getByText("9")).toBeInTheDocument();
  });
});
