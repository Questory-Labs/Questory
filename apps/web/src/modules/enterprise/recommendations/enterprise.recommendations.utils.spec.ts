import { describe, expect, it } from "vitest";
import type { RecommendationItem } from "@/lib/enterprise-types";
import {
  itemReactKey,
  uniqueRecommendationItems,
} from "./enterprise.recommendations.utils";

const extra = (name: string, itemKey: string): RecommendationItem => ({
  kind: "game",
  domain: "games",
  name,
  score: 0.45,
  reasons: ["Popular in your region"],
  itemKey,
});

describe("uniqueRecommendationItems", () => {
  it("keeps the first extra when storefront lists share a key", () => {
    const items = [
      extra("Steam Machine", "ext:regional-new:steam-machine"),
      extra("Steam Machine", "ext:regional-new:steam-machine"),
      extra("Hades II", "ext:regional-new:hades-ii"),
    ];
    const unique = uniqueRecommendationItems(items);
    expect(unique.map((i) => i.itemKey)).toEqual([
      "ext:regional-new:steam-machine",
      "ext:regional-new:hades-ii",
    ]);
  });

  it("falls back to kind+id when itemKey is missing", () => {
    const item: RecommendationItem = {
      kind: "game",
      domain: "games",
      gameId: "g1",
      name: "Hades",
      score: 0.9,
      reasons: [],
    };
    expect(itemReactKey(item)).toBe("game:g1");
  });
});
