import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { FriendCompare } from "@questorylabs/shared";
import { CompareHero } from "./CompareHero";

const data: FriendCompare = {
  friend: { steamId: "765", personaName: "Gaben", avatarUrl: null },
  commonGames: 1,
  uniqueToYou: 1,
  uniqueToFriend: 2,
  yourPlaytimeHours: 0,
  friendPlaytimeHours: 0,
  favoriteGenresYou: ["Action", "RPG"],
  favoriteGenresFriend: ["RPG"],
  mutualWishlist: 0,
  libraryValueYou: 0,
  libraryValueFriend: 0,
  challengeGames: [],
  commonGameList: [],
};

describe("CompareHero", () => {
  afterEach(cleanup);

  it("shows the shared genre line, overlap and plan link", () => {
    render(<CompareHero data={data} />);
    expect(screen.getByText("Both like RPG")).toBeInTheDocument();
    expect(screen.getAllByText("25").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Plan a session" })).toHaveAttribute(
      "href",
      "/multiplayer?friends=765",
    );
  });

  it("hides overlap when the friend library is not cached", () => {
    render(
      <CompareHero
        data={{
          ...data,
          meta: {
            friendLibraryCached: false,
            friendLibraryTruncated: false,
            gamesPerFriendLimit: 200,
          },
        }}
      />,
    );
    expect(screen.queryByText("Taste overlap")).not.toBeInTheDocument();
  });
});
