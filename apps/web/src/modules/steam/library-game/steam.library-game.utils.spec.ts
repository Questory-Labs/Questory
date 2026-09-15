import { describe, expect, it } from "vitest";
import {
  costPerHour,
  friendRank,
  glanceTiles,
  hltbStory,
  hoursCaption,
  playtimeHours,
  priceStory,
} from "./steam.library-game.utils";

describe("playtimeHours", () => {
  it("rounds minutes to one decimal hour", () => {
    expect(playtimeHours(180)).toBe(3);
    expect(playtimeHours(90)).toBe(1.5);
  });
});

describe("costPerHour", () => {
  it("returns null when unplayed", () => {
    expect(costPerHour(0, 10, 20)).toEqual({ value: null, source: null });
  });

  it("prefers recorded price paid", () => {
    expect(costPerHour(10, 20, 40)).toEqual({ value: 2, source: "paid" });
  });

  it("falls back to store price", () => {
    expect(costPerHour(10, null, 15)).toEqual({ value: 1.5, source: "store" });
  });
});

describe("hltbStory", () => {
  const hltb = {
    mainHours: 10,
    extraHours: 18,
    completionistHours: 30,
  };

  it("reports percent through main story", () => {
    expect(hltbStory(4, hltb)).toEqual({
      label: "40%",
      hint: "4h of 10h main story",
      ratio: 0.4,
    });
  });

  it("moves into extras after main", () => {
    expect(hltbStory(12, hltb)?.label).toBe("Extras");
  });

  it("marks beyond completionist", () => {
    expect(hltbStory(40, hltb)?.label).toBe("Beyond 100%");
  });

  it("returns null without a match", () => {
    expect(hltbStory(4, null)).toBeNull();
  });
});

describe("priceStory", () => {
  it("flags a historical low", () => {
    expect(priceStory(5, 5, 20, "USD")?.hint).toBe("At historical low");
  });

  it("reports drop vs historical high", () => {
    expect(priceStory(10, 4, 20, "USD")?.hint).toBe("−50% vs historical high");
  });
});

describe("friendRank", () => {
  it("ranks you among friends by hours", () => {
    expect(
      friendRank(12, [{ playtimeHours: 20 }, { playtimeHours: 8 }]),
    ).toEqual({ rank: 2, total: 3 });
  });
});

describe("hoursCaption", () => {
  it("uses queue copy when unplayed", () => {
    expect(hoursCaption({ unplayed: true })).toBe("Still in the queue");
  });
});

describe("glanceTiles", () => {
  it("omits empty tiles and labels store cost as an estimate", () => {
    const tiles = glanceTiles({
      achievements: null,
      hltb: { label: "40%", hint: "4h of 10h main story", ratio: 0.4 },
      cost: { value: 1.5, source: "store" },
      currency: "USD",
      review: null,
      friendCount: 0,
      rank: null,
      playersNow: null,
      price: { label: "$10.00", hint: "At historical low" },
    });
    expect(tiles.map((t) => t.label)).toEqual([
      "HowLongToBeat",
      "Cost / hour",
      "Store price",
    ]);
    expect(tiles[1].hint).toMatch(/Store estimate/);
  });

  it("adds a sessions tile when qMonitor has plays", () => {
    const tiles = glanceTiles({
      achievements: null,
      hltb: null,
      sessions: { count: 4, lastEndedAt: "2026-09-11T12:00:00.000Z" },
      cost: { value: null, source: null },
      currency: "USD",
      review: null,
      friendCount: 0,
      rank: null,
      playersNow: null,
      price: null,
    });
    expect(tiles).toEqual([
      expect.objectContaining({
        label: "Sessions",
        value: "4",
        href: "/sessions",
      }),
    ]);
  });
});
