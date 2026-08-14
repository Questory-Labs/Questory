import { describe, expect, it } from "vitest";
import { orderFriendsForLibraryCache } from "../../src/friends/friend-library-cache";

const friend = (steamid: string) => ({ steamid });

describe("orderFriendsForLibraryCache", () => {
  it("puts family members first even when they already have a cache", () => {
    const ordered = orderFriendsForLibraryCache(
      [friend("a"), friend("b"), friend("c")],
      {
        familySteamIds: ["c"],
        lastSyncedAtBySteamId: new Map([
          ["a", new Date("2026-08-01T00:00:00Z")],
          ["c", new Date("2026-08-13T00:00:00Z")],
        ]),
      },
    );
    expect(ordered.map((f) => f.steamid)).toEqual(["c", "b", "a"]);
  });

  it("prefers never-cached friends over already-cached ones", () => {
    const ordered = orderFriendsForLibraryCache(
      [friend("old"), friend("fresh"), friend("none")],
      {
        lastSyncedAtBySteamId: new Map([
          ["old", new Date("2026-07-01T00:00:00Z")],
          ["fresh", new Date("2026-08-13T00:00:00Z")],
        ]),
      },
    );
    expect(ordered.map((f) => f.steamid)).toEqual(["none", "old", "fresh"]);
  });

  it("does not mutate the input list", () => {
    const friends = [friend("b"), friend("a")];
    orderFriendsForLibraryCache(friends);
    expect(friends.map((f) => f.steamid)).toEqual(["b", "a"]);
  });
});
