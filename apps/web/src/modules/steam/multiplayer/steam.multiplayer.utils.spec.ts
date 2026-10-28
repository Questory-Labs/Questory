import { describe, expect, it } from "vitest";
import type { MultiplayerPlanGame } from "@questorylabs/shared";
import {
  parseFriendsParam,
  planMetaLine,
  planOwnership,
} from "./steam.multiplayer.utils";

const base: MultiplayerPlanGame = {
  appId: 1,
  name: "Deep Rock Galactic",
  headerImage: null,
  genres: ["Action"],
  categories: [],
  releaseYear: 2018,
  reviewScore: 97,
  minPlayers: 1,
  maxPlayers: 4,
  isSuggested: false,
  ownedByYou: true,
  ownedByFriends: ["Alice", "Bob"],
  missingFriends: [],
  ownership: "shared",
};

describe("planOwnership", () => {
  it("marks shared games as owned by all", () => {
    expect(planOwnership(base, 2)).toMatchObject({
      partySize: 3,
      ownedCount: 3,
      owners: "Owned by all 3",
      badge: "Everyone owns it",
      tone: "ok",
    });
  });

  it("flags games everyone but you owns", () => {
    expect(
      planOwnership(
        { ...base, ownership: "partial", ownedByYou: false },
        2,
      ),
    ).toMatchObject({ badge: "You don’t own it", ownedCount: 2, tone: "music" });
  });

  it("lists missing friends for partial ownership", () => {
    const r = planOwnership(
      {
        ...base,
        ownership: "partial",
        ownedByFriends: ["Alice"],
        missingFriends: ["Bob"],
      },
      2,
    );
    expect(r.owners).toBe("Owned by 2 of 3 · missing Bob");
    expect(r.badge).toBe("Partial");
  });

  it("shows the price on unowned suggestions", () => {
    const r = planOwnership(
      {
        ...base,
        ownership: "unowned",
        ownedByYou: false,
        ownedByFriends: [],
        isSuggested: true,
        currentPrice: 0,
      },
      1,
    );
    expect(r.badge).toBe("Suggested · Free");
    expect(r.ownedCount).toBe(0);
  });
});

describe("planMetaLine", () => {
  it("joins players, year, genre and review", () => {
    expect(planMetaLine(base)).toBe("1–4 players · 2018 · Action · ★ 97");
  });
});

describe("parseFriendsParam", () => {
  it("keeps numeric steam ids only", () => {
    expect(parseFriendsParam("765, abc,123,")).toEqual(["765", "123"]);
    expect(parseFriendsParam(null)).toEqual([]);
  });
});
