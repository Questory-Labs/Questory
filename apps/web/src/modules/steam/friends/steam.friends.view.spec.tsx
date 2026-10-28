import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { FriendCompare, FriendsListResponse } from "@questorylabs/shared";
import { FriendsView } from "./steam.friends.view";
import type { FriendsViewProps } from "./steam.friends.types";

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

const listValue: FriendsListResponse = {
  friends: [
    {
      steamId: "765",
      personaName: "Gaben",
      avatarUrl: null,
      libraryCached: true,
      personaState: 1,
      currentGameName: "Portal 2",
    },
  ],
  total: 1,
  page: 1,
  pageSize: 15,
  meta: {
    totalFriends: 1,
    librariesCached: 1,
    libraryCacheLimit: 50,
    gamesPerFriendLimit: 200,
    truncated: false,
    lastSyncedAt: null,
    onlineCount: 1,
  },
};

const renderView = (patch: Partial<FriendsViewProps>) =>
  render(
    <FriendsView
      {...({
        friends: resource<FriendsListResponse>({
          empty: false,
          failed: false,
          value: listValue,
        }),
        page: 1,
        setPage: () => undefined,
        query: "",
        setQuery: () => undefined,
        search: "",
        activeSteamId: null,
        selectFriend: () => undefined,
        compare: resource<FriendCompare>({ empty: true, failed: false }),
        ...patch,
      } as FriendsViewProps)}
    />,
  );

describe("FriendsView", () => {
  afterEach(cleanup);

  it("shows skeletons when friends are empty", () => {
    renderView({
      friends: resource<FriendsListResponse>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Gaben")).not.toBeInTheDocument();
  });

  it("shows an error when friends failed, even if empty", () => {
    renderView({
      friends: resource<FriendsListResponse>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load friends.")).toBeInTheDocument();
  });

  it("renders friends with presence when ready", () => {
    renderView({});
    expect(screen.getByText("Gaben")).toBeInTheDocument();
    expect(screen.getByText("In game · Portal 2")).toBeInTheDocument();
    expect(screen.getByText(/online now/)).toBeInTheDocument();
  });

  it("shows the library cache meta line", () => {
    renderView({
      friends: resource<FriendsListResponse>({
        empty: false,
        failed: false,
        value: {
          ...listValue,
          meta: { ...listValue.meta, truncated: true },
        },
      }),
    });
    expect(
      screen.getByText(/1\/1 libraries cached · truncated \(up to 50 friends/),
    ).toBeInTheDocument();
  });

  it("shows collection empty when the list is ready with no friends", () => {
    renderView({
      friends: resource<FriendsListResponse>({
        empty: false,
        failed: false,
        value: { ...listValue, friends: [], total: 0 },
      }),
    });
    expect(
      screen.getByText(
        "No friends synced yet. Make sure your Steam friends list is public.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a no-match message when a search has no results", () => {
    renderView({
      search: "zz",
      friends: resource<FriendsListResponse>({
        empty: false,
        failed: false,
        value: { ...listValue, friends: [], total: 0 },
      }),
    });
    expect(screen.getByText(/No friends match/)).toBeInTheDocument();
  });

  it("selects a friend from the Compare link and updates the search", () => {
    const selectFriend = vi.fn();
    const setQuery = vi.fn();
    renderView({ selectFriend, setQuery });
    const link = screen.getByRole("link", { name: "Compare" });
    expect(link).toHaveAttribute("href", "/friends/765");
    fireEvent.click(link);
    expect(selectFriend).toHaveBeenCalledWith("765");
    fireEvent.change(screen.getByPlaceholderText("Search friends"), {
      target: { value: "ga" },
    });
    expect(setQuery).toHaveBeenCalledWith("ga");
  });

  it("renders the compare pane for the active friend", () => {
    renderView({
      activeSteamId: "765",
      compare: resource<FriendCompare>({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load friend comparison."),
    ).toBeInTheDocument();
  });
});
