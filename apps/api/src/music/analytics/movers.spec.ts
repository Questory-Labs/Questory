import { describe, expect, it } from "vitest";
import { computeMovers, concentrationShare } from "./movers";

describe("concentrationShare", () => {
  it("returns the top-N share of listens", () => {
    expect(
      concentrationShare([{ count: 30 }, { count: 20 }, { count: 10 }], 100, 2),
    ).toBe(50);
  });

  it("returns 0 with no listens and clamps to 100", () => {
    expect(concentrationShare([{ count: 3 }], 0, 10)).toBe(0);
    expect(concentrationShare([{ count: 30 }, { count: 30 }], 40, 10)).toBe(100);
  });
});

describe("computeMovers", () => {
  const previous = [
    { id: "a", name: "A", count: 50 },
    { id: "b", name: "B", count: 40 },
    { id: "c", name: "C", count: 30 },
    { id: "d", name: "D", count: 20 },
  ];

  it("ranks climbers, fallers and new entries", () => {
    const current = [
      { id: "d", name: "D", count: 60 },
      { id: "a", name: "A", count: 55 },
      { id: "n", title: "N", artistName: "X", count: 10 },
      { id: "b", name: "B", count: 9 },
    ];
    const movers = computeMovers(current, previous, 50, 10);
    expect(movers[0]).toMatchObject({ id: "n", isNew: true, rank: 3, name: "N" });
    expect(movers.find((m) => m.id === "d")).toMatchObject({
      delta: 3,
      previousRank: 4,
      previousCount: 20,
    });
    expect(movers.find((m) => m.id === "a")?.delta).toBe(-1);
    expect(movers.find((m) => m.id === "b")?.delta).toBe(-2);
    expect(movers.find((m) => m.id === "n")?.artistName).toBe("X");
  });

  it("drops unchanged ranks and respects window and limit", () => {
    const current = [
      { id: "a", name: "A", count: 1 },
      { id: "c", name: "C", count: 1 },
      { id: "b", name: "B", count: 1 },
    ];
    expect(computeMovers(current, previous, 50, 10).map((m) => m.id)).toEqual([
      "c",
      "b",
    ]);
    expect(computeMovers(current, previous, 2, 10).map((m) => m.id)).toEqual(["c"]);
    expect(computeMovers(current, previous, 50, 1)).toHaveLength(1);
  });
});
