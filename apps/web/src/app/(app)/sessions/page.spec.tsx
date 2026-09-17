import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import type { PlaySessionPage, PlaySessionStats } from "@questorylabs/shared";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "@/lib/api";
import SessionsPage from "./page";

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

const emptyPage: PlaySessionPage = {
  total: 0,
  page: 1,
  pageSize: 15,
  items: [],
};

const populated: PlaySessionPage = {
  total: 1,
  page: 1,
  pageSize: 15,
  items: [
    {
      id: "ps1",
      title: "Dota 2",
      source: "steam",
      appId: 570,
      gameId: "g1",
      startedAt: "2026-01-01T00:00:00.000Z",
      endedAt: "2026-01-01T01:00:00.000Z",
      durationSecs: 3600,
      exe: "dota2.exe",
      hostOs: "windows",
      hostName: "desk",
      game: {
        id: "g1",
        name: "Dota 2",
        headerImage: null,
        appId: 570,
      },
    },
  ],
};

const emptyStats: PlaySessionStats = {
  sessionCount: 0,
  totalDurationSecs: 0,
  avgDurationSecs: 0,
  weekDurationSecs: 0,
  weekSessionCount: 0,
  unmatchedCount: 0,
  uniqueGames: 0,
  lastPlayedAt: null,
  windowDays: 14,
  weekDays: 7,
  byDay: [],
  topGames: [],
};

const populatedStats: PlaySessionStats = {
  ...emptyStats,
  sessionCount: 1,
  totalDurationSecs: 3600,
  avgDurationSecs: 3600,
  weekDurationSecs: 3600,
  weekSessionCount: 1,
  uniqueGames: 1,
  lastPlayedAt: "2026-01-01T01:00:00.000Z",
  byDay: [{ day: "2026-01-01", durationSecs: 3600, sessionCount: 1 }],
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
  ],
};

describe("SessionsPage", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
  });

  it("shows empty state when there are no sessions", async () => {
    vi.mocked(api).mockImplementation(async (path: string) => {
      if (path.includes("/play-sessions/stats")) return emptyStats;
      return emptyPage;
    });
    wrap(<SessionsPage />);
    expect(await screen.findByText("No sessions yet")).toBeInTheDocument();
    expect(screen.queryByText("Played")).not.toBeInTheDocument();
  });

  it("renders a session row when data is present", async () => {
    vi.mocked(api).mockImplementation(async (path: string) => {
      if (path.includes("/play-sessions/stats")) return populatedStats;
      return populated;
    });
    wrap(<SessionsPage />);
    expect(await screen.findByText("Played")).toBeInTheDocument();
    expect(screen.getAllByText("Dota 2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1h").length).toBeGreaterThan(0);
    expect(screen.getByText(/steam/)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Dota 2" })[0],
    ).toHaveAttribute("href", "/library/g1");
    expect(screen.getByRole("button", { name: "Assign" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});
