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
    expect(screen.getByText("Gaben")).toBeInTheDocument();
    expect(screen.getByText("Portal")).toBeInTheDocument();
    expect(screen.getByText("Half-Life")).toBeInTheDocument();
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
