import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { FriendsListResponse } from "@questorylabs/shared";
import { FriendsListPanel } from "./FriendsListPanel";

const value: FriendsListResponse = {
  friends: [
    {
      steamId: "1",
      personaName: "Alice",
      avatarUrl: null,
      libraryCached: false,
      personaState: 3,
    },
  ],
  total: 30,
  page: 1,
  pageSize: 15,
  meta: {
    totalFriends: 30,
    librariesCached: 0,
    libraryCacheLimit: 50,
    gamesPerFriendLimit: 200,
    truncated: false,
    lastSyncedAt: null,
  },
};

const friends = {
  value,
  error: null,
  busy: false,
  refreshing: false,
  updatedAt: 0,
  reload: async () => undefined,
  ready: true,
  empty: false,
  failed: false,
} as unknown as UseResourceResult<FriendsListResponse>;

describe("FriendsListPanel", () => {
  afterEach(cleanup);

  it("shows presence, library cache state and pagination", () => {
    const setPage = vi.fn();
    render(
      <FriendsListPanel
        friends={friends}
        page={1}
        setPage={setPage}
        query=""
        setQuery={() => undefined}
        search=""
        activeSteamId="1"
        selectFriend={() => undefined}
      />,
    );
    expect(screen.getByText("Away · No library cache")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compare" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(setPage).toHaveBeenCalledWith(2);
  });
});
