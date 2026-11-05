import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMultiplayerPlanFilters } from "./steam.multiplayer.hooks";

describe("useMultiplayerPlanFilters", () => {
  it("toggles selected friend ids into the plan body", () => {
    const { result } = renderHook(() => useMultiplayerPlanFilters());
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

  it("omits empty mode and genre from the body", () => {
    const { result } = renderHook(() => useMultiplayerPlanFilters());
    expect(result.current.body.mode).toBeUndefined();
    expect(result.current.body.genre).toBeUndefined();
    act(() => {
      result.current.setGenre("Action");
      result.current.setMode("pvp");
    });
    expect(result.current.body.genre).toBe("Action");
    expect(result.current.body.mode).toBe("pvp");
  });

  it("preselects friends from the initial selection", () => {
    const { result } = renderHook(() => useMultiplayerPlanFilters(["200"]));
    expect(result.current.body.friendSteamIds).toEqual(["200"]);
  });
});
