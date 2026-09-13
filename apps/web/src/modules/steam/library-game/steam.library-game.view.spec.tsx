import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { GameDetail, LibraryEntry, PlaySessionPage } from "@questorylabs/shared";
import { LibraryGameView } from "./steam.library-game.view";
import type { LibraryGameViewProps } from "./steam.library-game.types";

vi.mock("@/components/TagsEditor", () => ({
  TagsEditor: () => null,
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

const entryValue: LibraryEntry = {
  id: "entry-1",
  playtimeForever: 180,
  playtime2Weeks: 30,
  lastPlayedAt: "2026-09-11T12:00:00.000Z",
  stores: ["steam"],
  ownerships: [{ store: "steam", playtimeForever: 180, listing: null }],
  game: {
    id: "game-1",
    appId: 400,
    name: "Portal",
    headerImage: null,
    genres: ["Puzzle"],
    categories: [],
    tags: [],
    developers: ["Valve"],
    publishers: ["Valve"],
    currentPrice: 9.99,
  },
};

const detailValue: GameDetail = {
  appId: 400,
  name: "Portal",
  headerImage: null,
  genres: ["Puzzle"],
  categories: [],
  tags: [],
  developers: ["Valve"],
  publishers: ["Valve"],
  minPlayers: null,
  maxPlayers: null,
  youOwn: true,
  yourPlaytimeHours: 3,
  friendOwners: [],
  price: {
    current: 9.99,
    lowest: 4.99,
    historicalLow: 4.99,
    historicalHigh: 19.99,
    currency: "USD",
    history: [],
  },
  review: null,
  hltb: null,
};

const emptySessions: PlaySessionPage = {
  total: 0,
  page: 1,
  pageSize: 8,
  items: [],
};

const renderView = (patch: Partial<LibraryGameViewProps> = {}) =>
  render(
    <LibraryGameView
      {...({
        gameId: "game-1",
        entry: resource<LibraryEntry>({
          empty: false,
          failed: false,
          value: entryValue,
        }),
        detail: resource<GameDetail>({
          empty: false,
          failed: false,
          value: detailValue,
        }),
        sessions: resource<PlaySessionPage>({
          empty: false,
          failed: false,
          value: emptySessions,
        }),
        ...patch,
      } as LibraryGameViewProps)}
    />,
  );

describe("LibraryGameView", () => {
  afterEach(cleanup);

  it("shows a skeleton when the entry is empty", () => {
    renderView({
      entry: resource<LibraryEntry>({ empty: true, failed: false }),
      detail: resource<GameDetail>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Portal")).not.toBeInTheDocument();
    expect(screen.queryByText("Your playtime")).not.toBeInTheDocument();
  });

  it("shows an error when the entry failed", () => {
    renderView({
      entry: resource<LibraryEntry>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load this game.")).toBeInTheDocument();
  });

  it("renders the game header when the entry is ready", () => {
    const { container } = renderView({});
    expect(screen.getByRole("heading", { name: "Portal" })).toBeInTheDocument();
    expect(screen.getByText("Your playtime")).toBeInTheDocument();
    expect(screen.getByText("3h")).toBeInTheDocument();
    expect(screen.getByText("HowLongToBeat")).toBeInTheDocument();
    const cover = container.querySelector(".aspect-\\[460\\/215\\]")?.parentElement;
    expect(cover?.className).not.toContain("grow");
  });

  it("shows a detail error without hiding the entry header", () => {
    renderView({
      detail: resource<GameDetail>({ empty: true, failed: true }),
    });
    expect(screen.getByRole("heading", { name: "Portal" })).toBeInTheDocument();
    expect(
      screen.getByText("Could not load enriched game stats."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Players online")).not.toBeInTheDocument();
  });

  it("shows qMonitor sessions without waiting on Steam detail", () => {
    renderView({
      detail: resource<GameDetail>({ empty: true, failed: true }),
      sessions: resource<PlaySessionPage>({
        empty: false,
        failed: false,
        value: {
          total: 1,
          page: 1,
          pageSize: 8,
          items: [
            {
              id: "ps1",
              title: "Portal",
              source: "steam",
              appId: 400,
              gameId: "game-1",
              startedAt: "2026-09-11T11:00:00.000Z",
              endedAt: "2026-09-11T12:00:00.000Z",
              durationSecs: 3600,
              exe: null,
              hostOs: "windows",
              hostName: "pc",
              game: null,
            },
          ],
        },
      }),
    });
    expect(screen.getByText("Recent sessions")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All sessions →" })).toBeInTheDocument();
  });
});
