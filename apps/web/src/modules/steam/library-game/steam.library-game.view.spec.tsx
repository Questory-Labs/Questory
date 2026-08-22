import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { GameDetail, LibraryEntry } from "@questorylabs/shared";
import { LibraryGameView } from "./steam.library-game.view";
import type { LibraryGameViewProps } from "./steam.library-game.types";

vi.mock("@/components/TagsEditor", () => ({
  TagsEditor: () => null,
}));

vi.mock("@/components/GameDetailStats", () => ({
  GameDetailStats: () => <div>game details</div>,
  SectionTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
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
  stores: ["steam"],
  ownerships: [
    { store: "steam", playtimeForever: 180, listing: null },
  ],
  game: {
    id: "game-1",
    appId: 400,
    name: "Portal",
    headerImage: null,
    genres: ["Puzzle"],
    categories: [],
    tags: [],
    developers: [],
    publishers: [],
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
  developers: [],
  publishers: [],
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

const renderView = (patch: Partial<LibraryGameViewProps>) =>
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
    renderView({});
    expect(screen.getByRole("heading", { name: "Portal" })).toBeInTheDocument();
    expect(screen.getByText("Your playtime")).toBeInTheDocument();
    expect(screen.getByText("game details")).toBeInTheDocument();
  });

  it("shows a detail error without hiding the entry header", () => {
    renderView({
      detail: resource<GameDetail>({ empty: true, failed: true }),
    });
    expect(screen.getByRole("heading", { name: "Portal" })).toBeInTheDocument();
    expect(
      screen.getByText("Could not load enriched game stats."),
    ).toBeInTheDocument();
    expect(screen.queryByText("game details")).not.toBeInTheDocument();
  });
});
