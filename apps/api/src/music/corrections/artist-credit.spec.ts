import { describe, expect, it, vi } from "vitest";
import {
  loadArtistCreditsByTrackId,
  overlayArtistCredit,
} from "./artist-credit";

describe("overlayArtistCredit", () => {
  it("returns the mapped credit for a track", () => {
    const credits = new Map([["t1", "Amit Trivedi, Shreya Ghoshal"]]);
    expect(overlayArtistCredit("Amit Trivedi", "t1", credits)).toBe(
      "Amit Trivedi, Shreya Ghoshal",
    );
  });

  it("keeps the original name when no credit is stored", () => {
    expect(overlayArtistCredit("Amit Trivedi", "t1", new Map())).toBe(
      "Amit Trivedi",
    );
  });
});

describe("loadArtistCreditsByTrackId", () => {
  it("indexes credits by source and target track ids", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        artistCredit: "A & B",
        sourceTrackId: "src",
        targetTrackId: "dst",
      },
    ]);
    const credits = await loadArtistCreditsByTrackId(
      { userMusicRule: { findMany } },
      "user1",
      ["dst"],
    );
    expect(credits.get("src")).toBe("A & B");
    expect(credits.get("dst")).toBe("A & B");
  });

  it("returns an empty map when no track ids are given", async () => {
    const findMany = vi.fn();
    const credits = await loadArtistCreditsByTrackId(
      { userMusicRule: { findMany } },
      "user1",
      [],
    );
    expect(credits.size).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });
});
