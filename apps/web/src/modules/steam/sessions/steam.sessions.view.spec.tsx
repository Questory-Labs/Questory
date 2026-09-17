import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  ResourceProvider,
  ResourceStore,
  type UseResourceResult,
} from "@questorylabs/qhttp/react";
import type { PlaySessionItem, PlaySessionPage, PlaySessionStats } from "@questorylabs/shared";
import { SessionsView } from "./steam.sessions.view";
import type { SessionsViewProps } from "./steam.sessions.types";

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

const item: PlaySessionItem = {
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
};

const populated: PlaySessionPage = {
  total: 1,
  page: 1,
  pageSize: 15,
  items: [item],
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
  lastPlayedAt: item.endedAt,
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

const renderView = (patch: Partial<SessionsViewProps>) => {
  const store = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={store}>
      <SessionsView
        {...({
          sessions: resource<PlaySessionPage>({
            empty: false,
            failed: false,
            value: populated,
          }),
          stats: resource<PlaySessionStats>({
            empty: false,
            failed: false,
            value: populatedStats,
          }),
          page: 1,
          setPage: () => undefined,
          dayGroups: [
            { dayKey: "2026-01-01", label: "Thu, Jan 1", items: [item] },
          ],
          ...patch,
        } as SessionsViewProps)}
      />
    </ResourceProvider>,
  );
};

describe("SessionsView", () => {
  afterEach(cleanup);

  it("shows skeletons when sessions are empty", () => {
    renderView({
      sessions: resource<PlaySessionPage>({ empty: true, failed: false }),
      stats: resource<PlaySessionStats>({ empty: true, failed: false }),
      dayGroups: [],
    });
    expect(screen.queryByText("No sessions yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Dota 2")).not.toBeInTheDocument();
  });

  it("shows an error when sessions failed, even if empty", () => {
    renderView({
      sessions: resource<PlaySessionPage>({ empty: true, failed: true }),
      dayGroups: [],
    });
    expect(screen.getByText("Could not load sessions.")).toBeInTheDocument();
  });

  it("renders a session row when ready", () => {
    renderView({});
    expect(screen.getByText("Played")).toBeInTheDocument();
    expect(screen.getAllByText("Dota 2").length).toBeGreaterThan(0);
  });

  it("shows collection empty when ready with no sessions", () => {
    renderView({
      sessions: resource<PlaySessionPage>({
        empty: false,
        failed: false,
        value: { total: 0, page: 1, pageSize: 15, items: [] },
      }),
      stats: resource<PlaySessionStats>({
        empty: false,
        failed: false,
        value: emptyStats,
      }),
      dayGroups: [],
    });
    expect(screen.getByText("No sessions yet")).toBeInTheDocument();
    expect(screen.queryByText("Played")).not.toBeInTheDocument();
  });

  it("shows a stats error without hiding the list", () => {
    renderView({
      stats: resource<PlaySessionStats>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load session stats.")).toBeInTheDocument();
    expect(screen.getByText("Dota 2")).toBeInTheDocument();
  });
});
