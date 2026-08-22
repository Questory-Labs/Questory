import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { FriendsListResponse } from "@questorylabs/shared";
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

  it("renders friends when ready", () => {
    renderView({});
    expect(screen.getByText("Gaben")).toBeInTheDocument();
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
});
