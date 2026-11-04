import { describe, expect, it } from "vitest";
import {
  minutesToHours,
  sharedGenresLine,
  tasteOverlapPercent,
} from "./steam.friend-compare.utils";

describe("friend compare utils", () => {
  it("computes taste overlap from the library union", () => {
    expect(
      tasteOverlapPercent({ commonGames: 2, uniqueToYou: 1, uniqueToFriend: 1 }),
    ).toBe(50);
    expect(
      tasteOverlapPercent({ commonGames: 0, uniqueToYou: 0, uniqueToFriend: 0 }),
    ).toBe(0);
  });

  it("lists up to two shared genres", () => {
    expect(
      sharedGenresLine(["Action", "RPG", "Indie"], ["indie", "rpg", "Action"]),
    ).toBe("Both like Action and RPG");
    expect(sharedGenresLine(["Action"], ["RPG"])).toBeNull();
  });

  it("converts minutes to one-decimal hours", () => {
    expect(minutesToHours(90)).toBe(1.5);
    expect(minutesToHours(undefined)).toBe(0);
  });
});
