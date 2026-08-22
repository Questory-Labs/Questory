import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Friend } from "@questorylabs/shared";
import { useMultiplayerPlanFilters } from "./steam.multiplayer.hooks";

const friends: Friend[] = [
  { steamId: "100", personaName: "Alice", avatarUrl: null },
  { steamId: "200", personaName: "Bob", avatarUrl: null },
];

describe("useMultiplayerPlanFilters", () => {
  it("toggles selected friend ids into the plan body", () => {
    const { result } = renderHook(() => useMultiplayerPlanFilters(friends));
    act(() => {
      result.current.toggle("100");
      result.current.toggle("200");
    });
    expect(result.current.selected).toEqual(["100", "200"]);
    expect(result.current.body.friendSteamIds).toEqual(["100", "200"]);
    act(() => {
      result.current.toggle("100");
    });
    expect(result.current.body.friendSteamIds).toEqual(["200"]);
  });

  it("filters friends by name or steam id", () => {
    const { result } = renderHook(() => useMultiplayerPlanFilters(friends));
    expect(result.current.filteredFriends).toHaveLength(2);
    act(() => {
      result.current.setFriendFilter("ali");
    });
    expect(result.current.filteredFriends.map((f) => f.personaName)).toEqual([
      "Alice",
    ]);
    act(() => {
      result.current.setFriendFilter("200");
    });
    expect(result.current.filteredFriends.map((f) => f.steamId)).toEqual([
      "200",
    ]);
  });

  it("omits empty mode and genre from the body", () => {
    const { result } = renderHook(() => useMultiplayerPlanFilters(friends));
    expect(result.current.body.mode).toBeUndefined();
    expect(result.current.body.genre).toBeUndefined();
    act(() => {
      result.current.setGenre("Action");
      result.current.setMode("pvp");
    });
    expect(result.current.body.genre).toBe("Action");
    expect(result.current.body.mode).toBe("pvp");
  });
});
