import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { DashboardStats, PlayNextItem } from "@questorylabs/shared";
import { DashboardView } from "./steam.dashboard.view";
import type { DashboardViewProps } from "./steam.dashboard.types";

let mockUser: { steamId: string | null; personaName: string } = {
  steamId: "1",
  personaName: "Sam",
};

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: mockUser }),
}));

const reload = async () => undefined;

const resource = <T,>(
  patch: Partial<UseResourceResult<T>> &
    Pick<UseResourceResult<T>, "empty" | "failed">,
): UseResourceResult<T> =>
  ({
    value: undefined,
    error: patch.failed ? new Error("fail") : null,
    busy: false,
    refreshing: false,
    updatedAt: 0,
    reload,
    ready: !patch.empty && !patch.failed,
    ...patch,
  }) as UseResourceResult<T>;

const idleSync = {
  active: false,
  current: null,
  doneCount: 0,
  total: 0,
} as DashboardViewProps["sync"];

const statsValue: DashboardStats = {
  librarySize: 10,
  totalPlaytimeHours: 12,
  unplayedCount: 2,
  wishlistCount: 3,
  activeFriends: 4,
  costPerHour: null,
  lifetimeAtCurrent: null,
  currency: "USD",
  nearCompletionCount: 1,
  currentSalesCount: 0,
  recentlyPlayed: [],
};

const hades = {
  appId: 1,
  name: "Hades",
  headerImage: null,
  playtimeForever: 120,
  lastPlayedAt: "2026-09-11T12:00:00.000Z",
};

const pick = (name: string, appId: number): PlayNextItem => ({
  appId,
  name,
  headerImage: null,
  playtimeForever: 60,
  lastPlayedAt: null,
  score: 1,
  reasons: ["genre fit"],
  genres: ["Action"],
});

const renderView = (patch: Partial<DashboardViewProps>) =>
  render(
    <DashboardView
      {...({
        recentlyPlayed: [],
        nextUp: [],
        stats: resource<DashboardStats>({ empty: false, failed: false, value: statsValue }),
        playNext: resource<PlayNextItem[]>({ empty: false, failed: false, value: [] }),
        sync: idleSync,
        ...patch,
      } as DashboardViewProps)}
    />,
  );

describe("DashboardView", () => {
  afterEach(() => {
    mockUser = { steamId: "1", personaName: "Sam" };
    cleanup();
  });

  describe("occupancy", () => {
    it("shows continue without waiting on play-next", () => {
      renderView({
        recentlyPlayed: [hades],
        playNext: resource<PlayNextItem[]>({ empty: true, failed: false }),
      });
      expect(screen.getByRole("heading", { name: /^Hades$/ })).toBeInTheDocument();
      expect(screen.getByText("Continue")).toBeInTheDocument();
      expect(document.querySelector(".aspect-\\[460\\/215\\]")).toBeTruthy();
      expect(screen.queryByText("Open Connections")).not.toBeInTheDocument();
    });

    it("keeps a hero skeleton when stats are ready, there is no recent, and play-next is still empty", () => {
      renderView({
        playNext: resource<PlayNextItem[]>({ empty: true, failed: false }),
      });
      expect(screen.queryByText("Continue")).not.toBeInTheDocument();
      expect(screen.queryByText("Open Connections")).not.toBeInTheDocument();
      expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
    });

    it("does not treat play-next failure as unlinked", () => {
      renderView({
        recentlyPlayed: [hades],
        playNext: resource<PlayNextItem[]>({ empty: true, failed: true }),
      });
      expect(screen.getByText("Continue")).toBeInTheDocument();
      expect(
        screen.getByText("Could not load play-next picks."),
      ).toBeInTheDocument();
      expect(screen.queryByText("Open Connections")).not.toBeInTheDocument();
    });

    it("does not promote a play-next pick as last-played when stats failed", () => {
      renderView({
        stats: resource<DashboardStats>({ empty: true, failed: true }),
        nextUp: [pick("Celeste", 2)],
        playNext: resource<PlayNextItem[]>({
          empty: false,
          failed: false,
          value: [pick("Celeste", 2)],
        }),
      });
      expect(
        screen.getByText("Could not load dashboard stats."),
      ).toBeInTheDocument();
      expect(screen.queryByText("Continue")).not.toBeInTheDocument();
    });

    it("shows unlinked only when stats are ready, there is no continue, and Steam is not linked", () => {
      mockUser = { steamId: null, personaName: "Sam" };
      renderView({
        playNext: resource<PlayNextItem[]>({ empty: true, failed: true }),
      });
      expect(screen.getByText("Open Connections")).toBeInTheDocument();
      expect(screen.queryByText("Continue")).not.toBeInTheDocument();
    });

    it("skeletons continue while stats are still empty", () => {
      renderView({
        stats: resource<DashboardStats>({ empty: true, failed: false }),
        playNext: resource<PlayNextItem[]>({ empty: true, failed: false }),
      });
      expect(screen.queryByText("Library")).not.toBeInTheDocument();
      expect(screen.queryByText("Open Connections")).not.toBeInTheDocument();
      expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
    });

    it("never uses stats.empty || playNext.empty as a page-wide unlinked gate", () => {
      renderView({
        recentlyPlayed: [hades],
        playNext: resource<PlayNextItem[]>({ empty: true, failed: false }),
      });
      expect(screen.queryByText("Open Connections")).not.toBeInTheDocument();
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });
  });

  it("renders stats when ready", () => {
    renderView({});
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Cost / hour")).toBeInTheDocument();
    expect(screen.getByText("Deal signals")).toBeInTheDocument();
    expect(screen.getByText("Near complete")).toBeInTheDocument();
    expect(screen.getByText("Friends")).toBeInTheDocument();
  });

  it("renders a 2-slice mix legend, not a third near-complete arc", () => {
    renderView({});
    expect(screen.getByRole("list")).toHaveTextContent("Played: 8");
    expect(screen.getByRole("list")).toHaveTextContent("Unplayed: 2");
    expect(screen.queryByText(/not a third slice/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Library played versus unplayed" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Near completion" })).not.toBeInTheDocument();
  });

  it("omits the Continue section when media flags are on", () => {
    renderView({
      recentlyPlayed: [hades],
      showMusic: true,
      showWatch: true,
      musicRecent: resource({
        empty: false,
        failed: false,
        value: {
          total: 1,
          page: 1,
          pageSize: 5,
          items: [
            {
              id: "listen-1",
              listenedAt: "2026-09-12T12:00:00.000Z",
              track: {
                id: "t1",
                title: "Hurt",
                artistName: "NewJeans",
                releaseTitle: null,
                imageUrl: "https://cdn.example/hurt.jpg",
                genres: [],
              },
            },
          ],
        },
      }),
      watchRecent: resource({
        empty: false,
        failed: false,
        value: {
          total: 1,
          page: 1,
          pageSize: 5,
          items: [
            {
              id: "w1",
              watchedAt: "2026-09-12T11:00:00.000Z",
              source: "trakt",
              precision: "title",
              title: {
                id: "m1",
                name: "1917",
                type: "movie",
                posterUrl: null,
                genres: [],
              },
              episode: null,
            },
          ],
        },
      }),
    });
    expect(screen.queryByRole("heading", { name: "Continue" })).not.toBeInTheDocument();
    expect(screen.queryByText("Resume a game, series, or book — not something you already finished")).not.toBeInTheDocument();
    expect(screen.getByText("Hades")).toBeInTheDocument();
    expect(screen.getByText("Play next")).toBeInTheDocument();
  });

  it("adds music glance without a continue strip", () => {
    renderView({
      recentlyPlayed: [hades],
      showMusic: true,
      musicInsights: resource({
        empty: false,
        failed: false,
        value: {
          range: "week",
          periodListens: 42,
          peakHour: null,
          peakDow: null,
          topGenre: null,
          topMood: null,
          listeningMinutes: 90,
          listensWithDuration: 40,
          durationCoverage: 80,
          newArtists: 2,
          newTracks: 3,
          topTrackShare: 0.1,
          uniqueArtists: 8,
          uniqueTracks: 12,
          serviceBreakdown: [],
          compare: { previousListens: 30, deltaPct: 40 },
        },
      }),
    });
    expect(screen.queryByRole("heading", { name: "Continue" })).not.toBeInTheDocument();
    expect(screen.getByText("Hades")).toBeInTheDocument();
    expect(screen.getByText("Listens")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("This week across Steam, music.")).toBeInTheDocument();
  });

  it("keeps game stats when music insights failed", () => {
    renderView({
      recentlyPlayed: [hades],
      showMusic: true,
      musicInsights: resource({ empty: true, failed: true }),
    });
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Could not load music stats.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Continue" })).not.toBeInTheDocument();
  });

  it("uses unified activity when music is on", () => {
    renderView({
      recentlyPlayed: [hades],
      showMusic: true,
      musicRecent: resource({
        empty: false,
        failed: false,
        value: { total: 1, page: 1, pageSize: 5, items: [] },
      }),
    });
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
    expect(screen.queryByText("Recently played")).not.toBeInTheDocument();
  });

  it("shows a danger empty state when recent music fails but keeps loaded activity", () => {
    renderView({
      recentlyPlayed: [hades],
      showMusic: true,
      musicRecent: resource({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load some recent activity."),
    ).toBeInTheDocument();
    expect(screen.getByText("Hades")).toBeInTheDocument();
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
  });

  it("packs media glance into the steam grid without a stray chapters tile", () => {
    renderView({
      showMusic: true,
      showWatch: true,
      showRead: true,
      musicInsights: resource({
        empty: false,
        failed: false,
        value: {
          range: "week",
          periodListens: 158,
          peakHour: null,
          peakDow: null,
          topGenre: null,
          topMood: null,
          listeningMinutes: 260,
          listensWithDuration: 150,
          durationCoverage: 90,
          newArtists: 1,
          newTracks: 4,
          topTrackShare: 0.2,
          uniqueArtists: 20,
          uniqueTracks: 40,
          serviceBreakdown: [],
          compare: { previousListens: 150, deltaPct: 2.6 },
        },
      }),
      watchInsights: resource({
        empty: false,
        failed: false,
        value: {
          range: "week",
          type: "all",
          periodWatches: 7,
          peakHour: null,
          peakDow: null,
          topGenre: null,
          watchingMinutes: 800,
          watchesWithRuntime: 7,
          runtimeCoverage: 100,
          newTitles: 2,
          topTitleShare: 0.3,
          uniqueTitles: 7,
          movieWatches: 7,
          showWatches: 0,
          movieMinutes: 800,
          showMinutes: 0,
          uniqueMovies: 7,
          uniqueShows: 0,
          sourceBreakdown: [],
          compare: { previousWatches: 3, deltaPct: 133.3 },
        },
      }),
      readInsights: resource({
        empty: false,
        failed: false,
        value: {
          range: "week",
          format: "all",
          periodEvents: 21,
          peakHour: null,
          peakDow: null,
          topGenre: null,
          chaptersLogged: 2959,
          newTitles: 1,
          topTitleShare: 0.4,
          uniqueTitles: 5,
          formatBreakdown: [],
          statusBreakdown: [],
          sourceBreakdown: [],
          compare: { previousEvents: 12, deltaPct: 75 },
        },
      }),
    });
    expect(screen.getByText("Friends")).toBeInTheDocument();
    expect(screen.getByText("Listens")).toBeInTheDocument();
    expect(screen.getByText("Last 7 days · +2.6% vs prior")).toBeInTheDocument();
    expect(screen.getByText("Listening time")).toBeInTheDocument();
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(screen.getByText("Watches")).toBeInTheDocument();
    expect(
      screen.getByText("Last 7 days · 7 movies · +133.3% vs prior"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/0 TV/)).not.toBeInTheDocument();
    expect(screen.getByText("Read events")).toBeInTheDocument();
    expect(
      screen.getByText("Last 7 days · 2959 chapters · +75% vs prior"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Chapters logged")).not.toBeInTheDocument();
  });
});
