import { describe, expect, it } from "vitest";
import { libraryPlayMix, partitionMix } from "./partition-mix";

describe("partitionMix", () => {
  it("10/2/1 → exclusive slices sum to 10 (near-complete stays nested)", () => {
    const slices = libraryPlayMix(10, 2, 1);
    expect(slices.reduce((sum, d) => sum + d.value, 0)).toBe(10);
    expect(slices).toEqual([
      { name: "Played", value: 8, color: "#7dd3c0" },
      { name: "Unplayed", value: 2, color: "#8a7f9a" },
    ]);
  });

  it("omits empty exclusive parts", () => {
    expect(partitionMix(5, [{ name: "Unplayed", value: 0 }])).toEqual([
      { name: "Played", value: 5, color: "#7dd3c0" },
    ]);
  });
});
