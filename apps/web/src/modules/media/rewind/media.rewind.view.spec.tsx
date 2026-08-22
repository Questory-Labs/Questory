import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { mockResource } from "@/test/resource-mock";
import type {
  RewindInsightResponse,
  RewindMusicStats,
  RewindStatsResponse,
} from "@questorylabs/shared";
import { RewindView } from "./media.rewind.view";
import type { RewindViewProps } from "./media.rewind.types";

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

const baseProps = (): RewindViewProps => ({
  domain: "music",
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

const renderView = (patch: Partial<RewindViewProps> = {}) =>
  render(
    <RewindView {...({ ...baseProps(), ...patch } as RewindViewProps)} />,
  );

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
    expect(screen.queryByText("Total Plays")).not.toBeInTheDocument();
  });

  it("shows a loading message when stats are empty", () => {
    renderView({
      statsQuery: mockResource<RewindStatsResponse>({
        empty: true,
        failed: false,
      }),
    });
    expect(screen.getByText("Crunching the numbers...")).toBeInTheDocument();
    expect(screen.queryByText("Total Plays")).not.toBeInTheDocument();
  });

  it("renders stats when ready", () => {
    renderView({});
    expect(screen.getByText("Total Plays")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
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

  it("renders AI cards when ready", () => {
    renderView({});
    expect(screen.getByText("Vibe Check")).toBeInTheDocument();
    expect(screen.getByText("A cozy year of listening.")).toBeInTheDocument();
  });
});
