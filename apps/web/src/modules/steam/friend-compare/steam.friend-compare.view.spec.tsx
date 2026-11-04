import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { FriendCompare } from "@questorylabs/shared";
import { FriendCompareView } from "./steam.friend-compare.view";
import type { FriendCompareViewProps } from "./steam.friend-compare.types";

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

const compareValue: FriendCompare = {
  friend: {
    steamId: "765",
    personaName: "Gaben",
    avatarUrl: null,
  },
  commonGames: 2,
  uniqueToYou: 1,
  uniqueToFriend: 3,
  yourPlaytimeHours: 10,
  friendPlaytimeHours: 20,
  favoriteGenresYou: [],
  favoriteGenresFriend: [],
  mutualWishlist: 1,
  libraryValueYou: 0,
  libraryValueFriend: 0,
  challengeGames: [{ appId: 1, name: "Portal", headerImage: null }],
  commonGameList: [{ appId: 2, name: "Half-Life", headerImage: null }],
};

const renderView = (patch: Partial<FriendCompareViewProps>) =>
  render(
    <FriendCompareView
      {...({
        compare: resource<FriendCompare>({
          empty: false,
          failed: false,
          value: compareValue,
        }),
        ...patch,
      } as FriendCompareViewProps)}
    />,
  );

describe("FriendCompareView", () => {
  afterEach(cleanup);

  it("shows skeletons when compare is empty", () => {
    renderView({
      compare: resource<FriendCompare>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Common games")).not.toBeInTheDocument();
  });

  it("shows an error when compare failed, even if empty", () => {
    renderView({
      compare: resource<FriendCompare>({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load friend comparison."),
    ).toBeInTheDocument();
  });

  it("renders comparison stats when ready", () => {
    renderView({});
    expect(screen.getByRole("heading", { name: "You and Gaben" })).toBeInTheDocument();
    expect(screen.getByText("Portal")).toBeInTheDocument();
    expect(screen.getByText("Half-Life")).toBeInTheDocument();
    expect(screen.getByText("Taste overlap")).toBeInTheDocument();
  });

  it("links Plan a session to the multiplayer planner with the friend", () => {
    renderView({});
    expect(screen.getByRole("link", { name: "Plan a session" })).toHaveAttribute(
      "href",
      "/multiplayer?friends=765",
    );
  });

  it("shows per-game hours for both players", () => {
    renderView({
      compare: resource<FriendCompare>({
        empty: false,
        failed: false,
        value: {
          ...compareValue,
          commonGameList: [
            {
              appId: 2,
              name: "Half-Life",
              headerImage: null,
              yourPlaytimeMinutes: 90,
              friendPlaytimeMinutes: 600,
            },
          ],
        },
      }),
    });
    const row = screen.getByText("Half-Life").closest("tr")!;
    expect(row).toHaveTextContent("1.5 h");
    expect(row).toHaveTextContent("10 h");
  });

  it("warns when the friend library is truncated", () => {
    renderView({
      compare: resource<FriendCompare>({
        empty: false,
        failed: false,
        value: {
          ...compareValue,
          meta: {
            friendLibraryCached: true,
            friendLibraryTruncated: true,
            gamesPerFriendLimit: 200,
          },
        },
      }),
    });
    expect(
      screen.getByText(/Friend library cache may be truncated/),
    ).toBeInTheDocument();
  });

  it("shows collection empty when lists have no games", () => {
    renderView({
      compare: resource<FriendCompare>({
        empty: false,
        failed: false,
        value: { ...compareValue, challengeGames: [], commonGameList: [] },
      }),
    });
    expect(
      screen.getByText("No unplayed games in common."),
    ).toBeInTheDocument();
    expect(screen.getByText("No games in common yet.")).toBeInTheDocument();
  });
});
