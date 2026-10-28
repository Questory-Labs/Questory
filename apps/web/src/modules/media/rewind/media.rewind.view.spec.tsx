import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { mockResource } from "@/test/resource-mock";
import type {
  RewindInsightResponse,
  RewindMusicStats,
  RewindStatsResponse,
} from "@questorylabs/shared";
import { RewindView } from "./media.rewind.view";
import type { RewindViewProps } from "./media.rewind.types";
import { buildRewindSummary } from "./media.rewind.summary";

const musicStats: RewindMusicStats = {
  domain: "music",
  period: "2026-07",
  totalPlays: 42,
  listeningMinutes: 120,
  uniqueTracks: 10,
  uniqueArtists: 4,
  newTracks: 3,
  newArtists: 1,
  topArtists: [{ id: "a1", name: "Radiohead", count: 12 }],
  topTracks: [{ id: "t1", name: "Karma Police", count: 8 }],
  topGenres: [{ id: "g1", name: "Rock", count: 20 }],
  peakHour: { index: 21, label: "9pm", count: 5 },
  peakDow: { index: 5, label: "Friday", count: 10 },
};

const aiValue: RewindInsightResponse = {
  period: "2026-07",
  content: "<vibecheck>A cozy year of listening.</vibecheck>",
  generatedAt: "2026-08-01T00:00:00.000Z",
  cached: true,
};

const baseProps = (): Omit<RewindViewProps, "summary"> => ({
  domain: "music",
  enabledDomains: { music: true },
  year: 2026,
  month: 7,
  setMonth: () => undefined,
  handleYearChange: () => undefined,
  handleRedo: () => undefined,
  enterpriseEnabled: true,
  statsQuery: mockResource<RewindStatsResponse>({
    empty: false,
    failed: false,
    value: musicStats,
  }),
  aiQuery: mockResource<RewindInsightResponse>({
    empty: false,
    failed: false,
    value: aiValue,
  }),
  availableMonths: [1, 2, 3, 4, 5, 6, 7],
  hasCompletedMonths: true,
  period: "2026-07",
  aiGenerationAllowed: true,
  aiPeriodError: null,
  forceRedo: false,
});

const renderView = (patch: Partial<RewindViewProps> = {}) => {
  const props = { ...baseProps(), ...patch };
  const value = props.statsQuery.value;
  const summary = value ? buildRewindSummary(value) : null;
  return render(<RewindView {...({ summary, ...props } as RewindViewProps)} />);
};

describe("RewindView", () => {
  afterEach(cleanup);

  it("shows an error when stats failed, even if empty", () => {
    renderView({
      statsQuery: mockResource<RewindStatsResponse>({
        empty: true,
        failed: true,
      }),
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Crunching the numbers...")).not.toBeInTheDocument();
    expect(screen.queryByText("Total plays")).not.toBeInTheDocument();
  });

  it("shows a loading message when stats are empty", () => {
    renderView({
      statsQuery: mockResource<RewindStatsResponse>({
        empty: true,
        failed: false,
      }),
    });
    expect(screen.getByText("Crunching the numbers...")).toBeInTheDocument();
    expect(screen.queryByText("Total plays")).not.toBeInTheDocument();
  });

  it("renders stats when ready", () => {
    renderView({});
    expect(screen.getByText("Total plays")).toBeInTheDocument();
    expect(screen.getAllByText("42").length).toBeGreaterThan(0);
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText("Your top insights for July 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Music Rewind");
  });

  it("shows an error when AI failed, even if empty", () => {
    renderView({
      aiQuery: mockResource<RewindInsightResponse>({
        empty: true,
        failed: true,
      }),
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Synthesizing insights...")).not.toBeInTheDocument();
  });

  it("shows a spinner when AI is empty", () => {
    renderView({
      aiQuery: mockResource<RewindInsightResponse>({
        empty: true,
        failed: false,
      }),
    });
    expect(screen.getByText("Synthesizing insights...")).toBeInTheDocument();
    expect(screen.queryByText("Vibe Check")).not.toBeInTheDocument();
  });

  it("renders the extras tiles, bars and faded list with coverage", () => {
    renderView({
      period: "2025",
      statsQuery: mockResource<RewindStatsResponse>({
        empty: false,
        failed: false,
        value: {
          ...musicStats,
          period: "2025",
          activeDays: 120,
          longestStreakDays: 9,
          longestGapDays: 14,
          busiestDay: { date: "2025-03-02", count: 61 },
          monthly: [
            { month: "2025-01", count: 30, topItem: "Radiohead" },
            { month: "2025-02", count: 50, topItem: "Bjork" },
          ],
          prior: { total: 300, deltaPct: 37, newItems: 20, returningItems: 44, coverage: true },
          droppedOff: [{ id: "x", name: "Portishead", count: 25 }],
          maxRepeatsInDay: { name: "Karma Police", count: 7, date: "2025-04-01" },
        },
      }),
    });
    expect(screen.getByText("Longest streak")).toBeInTheDocument();
    expect(screen.getByText("9 days")).toBeInTheDocument();
    expect(screen.getByText("Mar 2")).toBeInTheDocument();
    expect(screen.getByText("vs 2024")).toBeInTheDocument();
    expect(screen.getByText("+37%")).toBeInTheDocument();
    expect(screen.getByText("14 days")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Month by month activity\. Peak Feb · mostly Bjork/ })).toBeInTheDocument();
    expect(screen.getByText("Faded out since 2024")).toBeInTheDocument();
    expect(screen.getByText("Portishead")).toBeInTheDocument();
    expect(screen.getByText("7×")).toBeInTheDocument();
  });

  it("hides the prior comparison and faded list without coverage", () => {
    renderView({
      statsQuery: mockResource<RewindStatsResponse>({
        empty: false,
        failed: false,
        value: {
          ...musicStats,
          prior: { total: 300, deltaPct: 37, newItems: 20, returningItems: 44, coverage: false },
          droppedOff: [{ id: "x", name: "Portishead", count: 25 }],
        },
      }),
    });
    expect(screen.queryByText(/^vs /)).not.toBeInTheDocument();
    expect(screen.queryByText("Portishead")).not.toBeInTheDocument();
    expect(screen.queryByText(/Faded out since/)).not.toBeInTheDocument();
  });

  it("renders watch ratings, unfinished and binge lists", () => {
    renderView({
      domain: "watch",
      statsQuery: mockResource<RewindStatsResponse>({
        empty: false,
        failed: false,
        value: {
          domain: "watch",
          period: "2026-07",
          totalWatches: 10,
          watchingMinutes: 600,
          uniqueTitles: 3,
          uniqueMovies: 2,
          uniqueShows: 1,
          movieWatches: 2,
          showWatches: 8,
          topTitles: [],
          topGenres: [],
          peakHour: null,
          peakDow: null,
          avgRating: 7.5,
          ratedCount: 2,
          topRated: [{ id: "a", name: "Dune", count: 9 }],
          unfinished: [{ id: "b", name: "Tenet", count: 40 }],
          bingeRuns: [{ id: "c", name: "Severance", count: 5 }],
          completedSeasons: 4,
          droppedTitles: 1,
        },
      }),
    });
    expect(screen.getByText("Top rated · avg 7.5")).toBeInTheDocument();
    expect(screen.getAllByText("9/10").length).toBe(2);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("seasons")).toBeInTheDocument();
    expect(screen.getByText("Dropped")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("5 eps")).toBeInTheDocument();
  });

  it("renders games stats, top games and the session upsell", () => {
    const games = (sessionsAvailable: boolean): RewindStatsResponse => ({
      domain: "games",
      period: "2025",
      totalMinutes: 1800,
      sessions: sessionsAvailable ? 12 : 0,
      sessionsAvailable,
      uniqueGames: 3,
      newGames: 1,
      topGames: [{ id: "g1", name: "Hades II", count: 1200 }],
      topGenres: [{ id: "roguelike", name: "Roguelike", count: 1200 }],
      longestSession: sessionsAvailable
        ? { name: "Hades II", minutes: 240, date: "2025-03-01" }
        : null,
      lateNightShare: sessionsAvailable ? 34 : null,
      peakHour: sessionsAvailable ? { index: 22, label: "10pm", count: 300 } : null,
      peakDow: null,
      backlog: 7,
      achievementsInPeriod: 4,
      perfectGames: 2,
    });
    renderView({
      domain: "games",
      statsQuery: mockResource<RewindStatsResponse>({
        empty: false,
        failed: false,
        value: games(true),
      }),
    });
    expect(screen.getByText("Hours played")).toBeInTheDocument();
    expect(screen.getAllByText("30").length).toBeGreaterThan(0);
    expect(screen.getByText("Top games")).toBeInTheDocument();
    expect(screen.getByText("2 games at 100%")).toBeInTheDocument();
    expect(screen.getByText("34% late night")).toBeInTheDocument();
    expect(screen.getByText("Unplayed today")).toBeInTheDocument();
    expect(screen.queryByText("Install qMonitor to unlock session stats")).toBeNull();
    cleanup();
    renderView({
      domain: "games",
      statsQuery: mockResource<RewindStatsResponse>({
        empty: false,
        failed: false,
        value: games(false),
      }),
    });
    expect(screen.getByText("Install qMonitor to unlock session stats")).toBeInTheDocument();
    expect(screen.queryByText("Peak playing")).toBeNull();
  });

  it("renders one tile per active area for the unified rewind", () => {
    renderView({
      domain: "all",
      statsQuery: mockResource<RewindStatsResponse>({
        empty: false,
        failed: false,
        value: {
          domain: "all",
          period: "2026-07",
          domains: { music: musicStats },
          daily: [{ date: "2026-07-04", counts: { music: 3 } }],
          busiestSince: "2026-03",
        },
      }),
      aiQuery: mockResource<RewindInsightResponse>({
        empty: false,
        failed: false,
        value: { ...aiValue, content: "<musicyear>Mostly **Radiohead**.</musicyear>" },
      }),
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your Rewind");
    expect(screen.getByText("Music", { ignore: "a, script, style" })).toBeInTheDocument();
    expect(screen.getByText("42 plays · Radiohead")).toBeInTheDocument();
    expect(screen.getByText("Busiest month since March 2026.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Day by day activity, weekends highlighted/ })).toBeInTheDocument();
    expect(screen.getByText("Your Music")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download share card" })).toBeInTheDocument();
    expect(screen.queryByText("Watch")).toBeNull();
  });

  it("renders AI cards when ready", () => {
    renderView({});
    expect(screen.getByText("Vibe Check")).toBeInTheDocument();
    expect(screen.getByText("A cozy year of listening.")).toBeInTheDocument();
  });

  it("keeps the AI period error and hides the panel without enterprise", () => {
    renderView({ aiGenerationAllowed: false, aiPeriodError: "Pick a finished month." });
    expect(screen.getByText("Pick a finished month.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeDisabled();
    cleanup();
    renderView({ enterpriseEnabled: false });
    expect(screen.queryByRole("button", { name: "Regenerate" })).toBeNull();
  });

  it("shows the in-progress count for read", () => {
    renderView({
      domain: "read",
      statsQuery: mockResource<RewindStatsResponse>({
        empty: false,
        failed: false,
        value: {
          domain: "read",
          period: "2026-07",
          totalEvents: 9,
          chaptersLogged: 30,
          uniqueTitles: 3,
          topTitles: [],
          topGenres: [],
          formatBreakdown: [{ name: "Manga", count: 3 }, { name: "Novel", count: 1 }],
          peakHour: null,
          peakDow: null,
          statusBreakdown: { completed: 1, dropped: 0, repeating: 2 },
          inProgress: 4,
        },
      }),
    });
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Re-reading")).toBeInTheDocument();
    expect(screen.getByText("Formats")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("pages through AI cards", () => {
    renderView({
      aiQuery: mockResource<RewindInsightResponse>({
        empty: false,
        failed: false,
        value: {
          ...aiValue,
          content: "<vibecheck>First take.</vibecheck>\n<crossover>Second take.</crossover>",
        },
      }),
    });
    expect(screen.getByText("AI insight 1 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next insight" }));
    expect(screen.getByText("Second take.")).toBeInTheDocument();
    expect(screen.getByText("AI insight 2 of 2")).toBeInTheDocument();
  });
});
