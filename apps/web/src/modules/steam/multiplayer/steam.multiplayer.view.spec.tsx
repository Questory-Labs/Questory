import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  FriendsListResponse,
  MultiplayerPlanGame,
  MultiplayerPlanResponse,
} from "@questorylabs/shared";
import { MultiplayerView } from "./steam.multiplayer.view";
import type { MultiplayerViewProps } from "./steam.multiplayer.types";
import type { useMultiplayerPlanFilters } from "./steam.multiplayer.hooks";

vi.mock("@/components/FamilyGameSidebar", () => ({
  FamilyGameSidebar: () => null,
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

const idleFilters = {
  selected: [],
  friendFilter: "",
  setFriendFilter: () => undefined,
  minPlayers: 2,
  setMinPlayers: () => undefined,
  maxPlayers: 8,
  setMaxPlayers: () => undefined,
  minYear: 2000,
  setMinYear: () => undefined,
  maxYear: 2026,
  setMaxYear: () => undefined,
  mode: "",
  setMode: () => undefined,
  genre: "",
  setGenre: () => undefined,
  sortBy: "popularity",
  setSortBy: () => undefined,
  suggested: false,
  setSuggested: () => undefined,
  strictLibraryMatching: false,
  setStrictLibraryMatching: () => undefined,
  filteredFriends: [],
  body: {
    friendSteamIds: [],
    minPlayers: 2,
    maxPlayers: 8,
    minYear: 2000,
    maxYear: 2026,
    sortBy: "popularity",
    suggested: false,
    strictLibraryMatching: false,
  },
  toggle: () => undefined,
} as unknown as ReturnType<typeof useMultiplayerPlanFilters>;

const emptyFriends: FriendsListResponse = {
  friends: [],
  total: 0,
  page: 1,
  pageSize: 100,
  meta: {
    totalFriends: 0,
    librariesCached: 0,
    libraryCacheLimit: 0,
    gamesPerFriendLimit: 0,
    truncated: false,
    lastSyncedAt: null,
  },
};

const game: MultiplayerPlanGame = {
  appId: 10,
  name: "It Takes Two",
  headerImage: null,
  genres: ["Adventure"],
  categories: [],
  releaseYear: 2021,
  reviewScore: 95,
  minPlayers: 2,
  maxPlayers: 2,
  isSuggested: false,
  ownedByYou: true,
  ownedByFriends: [],
  missingFriends: [],
  ownership: "shared",
};

const planValue: MultiplayerPlanResponse = {
  minPlayers: 2,
  maxPlayers: 8,
  minYear: 2000,
  maxYear: 2026,
  sortBy: "popularity",
  friendCount: 0,
  games: [game],
};

const renderView = (patch: Partial<MultiplayerViewProps> = {}) =>
  render(
    <MultiplayerView
      {...({
        friends: resource<FriendsListResponse>({
          empty: false,
          failed: false,
          value: emptyFriends,
        }),
        plan: resource<MultiplayerPlanResponse>({
          empty: false,
          failed: false,
          value: planValue,
        }),
        partyFriends: [],
        pageGames: [game],
        page: 1,
        setPage: () => undefined,
        totalPages: 1,
        selectedAppId: null,
        setSelectedAppId: () => undefined,
        filters: idleFilters,
        ...patch,
      } as MultiplayerViewProps)}
    />,
  );

describe("MultiplayerView", () => {
  afterEach(cleanup);

  it("shows a skeleton when the plan is empty", () => {
    renderView({
      plan: resource<MultiplayerPlanResponse>({ empty: true, failed: false }),
      pageGames: [],
    });
    expect(screen.queryByText("It Takes Two")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Loading content")).toBeInTheDocument();
  });

  it("shows an error when the plan failed", () => {
    renderView({
      plan: resource<MultiplayerPlanResponse>({ empty: true, failed: true }),
      pageGames: [],
    });
    expect(
      screen.getByText("Could not load multiplayer plan."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading content")).not.toBeInTheDocument();
  });

  it("renders games when ready", () => {
    renderView({});
    expect(screen.getByText("It Takes Two")).toBeInTheDocument();
  });

  it("shows collection empty when ready with no games", () => {
    renderView({
      plan: resource<MultiplayerPlanResponse>({
        empty: false,
        failed: false,
        value: { ...planValue, games: [] },
      }),
      pageGames: [],
    });
    expect(
      screen.getByText(
        "No multiplayer titles found for this group. Try fewer friends, turn off strict matching, widen filters, or enable Suggested.",
      ),
    ).toBeInTheDocument();
  });
});
