import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { PlaySessionStats } from "@questorylabs/shared";
import { SessionsOverview } from "./SessionsOverview";

const stats: PlaySessionStats = {
  sessionCount: 4,
  totalDurationSecs: 9000,
  avgDurationSecs: 2250,
  weekDurationSecs: 5400,
  weekSessionCount: 2,
  unmatchedCount: 1,
  uniqueGames: 2,
  lastPlayedAt: "2026-01-15T12:00:00.000Z",
  windowDays: 14,
  weekDays: 7,
  byDay: [
    { day: "2026-01-14", durationSecs: 1800, sessionCount: 1 },
    { day: "2026-01-15", durationSecs: 3600, sessionCount: 1 },
  ],
  topGames: [
    {
      key: "g1",
      gameId: "g1",
      name: "Dota 2",
      headerImage: null,
      appId: 570,
      durationSecs: 3600,
      sessionCount: 1,
    },
    {
      key: "title:Unknown.exe",
      gameId: null,
      name: "Unknown.exe",
      headerImage: null,
      appId: null,
      durationSecs: 1800,
      sessionCount: 1,
    },
  ],
};

describe("SessionsOverview", () => {
  afterEach(cleanup);

  it("renders totals, the day chart, and top games", () => {
    render(<SessionsOverview stats={stats} />);
    expect(screen.getByText("Played")).toBeInTheDocument();
    expect(screen.getByText("2h 30m")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(screen.getByText("1h 30m")).toBeInTheDocument();
    expect(screen.getByText("Unmatched")).toBeInTheDocument();
    expect(screen.getByText("Assign to a library game")).toBeInTheDocument();
    expect(screen.getByText("Last 14 days")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Playtime by day" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dota 2" })).toHaveAttribute(
      "href",
      "/library/g1",
    );
    expect(screen.getByText("Unknown.exe")).toBeInTheDocument();
  });
});
