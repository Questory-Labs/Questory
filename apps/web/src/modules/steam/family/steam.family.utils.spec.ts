import { describe, expect, it } from "vitest";
import { FAMILY_MEMBER_LIMIT } from "@questorylabs/shared";
import {
  canRemoveFamilyMember,
  libraryMix,
  memberLabel,
  normalizeSteamId,
  remainingFamilySlots,
  shareableLabel,
} from "./steam.family.utils";

describe("steam.family.utils", () => {
  it("normalizes steam ids by trimming", () => {
    expect(normalizeSteamId("  76561198000000000  ")).toBe("76561198000000000");
  });

  it("counts remaining slots including the owner in the cap of 6", () => {
    expect(FAMILY_MEMBER_LIMIT).toBe(6);
    expect(remainingFamilySlots(1)).toBe(5);
    expect(remainingFamilySlots(6)).toBe(0);
    expect(remainingFamilySlots(8)).toBe(0);
  });

  it("does not allow removing the owner or yourself", () => {
    expect(canRemoveFamilyMember({ role: "owner", isMe: true })).toBe(false);
    expect(canRemoveFamilyMember({ role: "member", isMe: true })).toBe(false);
    expect(canRemoveFamilyMember({ role: "member", isMe: false })).toBe(true);
  });

  it("labels the current user", () => {
    expect(
      memberLabel({ personaName: "Sam", isMe: true, steamId: "1" }),
    ).toBe("Sam (me)");
  });

  it("splits a library into shared, unique and other widths", () => {
    expect(
      libraryMix({ librarySize: 10, sharedCount: 4, uniqueCount: 2 }, 20),
    ).toEqual({ shared: 20, unique: 10, other: 20 });
    expect(libraryMix({ librarySize: 3 }, 3)).toEqual({
      shared: 0,
      unique: 0,
      other: 100,
    });
  });

  it("labels shareable directions", () => {
    expect(
      shareableLabel({ direction: "toYou", ownerName: "Alex", wantedByName: "Sam" }),
    ).toBe("Alex → you");
    expect(
      shareableLabel({ direction: "fromYou", ownerName: "Sam", wantedByName: "Alex" }),
    ).toBe("You → Alex");
  });
});
