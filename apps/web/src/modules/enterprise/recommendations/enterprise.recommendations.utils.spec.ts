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

  it("keeps same-name items distinct when appId or url differ", () => {
    const byAppId: RecommendationItem[] = [
      {
        kind: "game",
        domain: "games",
        name: "Hades",
        score: 0.9,
        reasons: [],
        appId: 1145360,
      },
      {
        kind: "game",
        domain: "games",
        name: "Hades",
        score: 0.8,
        reasons: [],
        appId: 570,
      },
    ];
    const byUrl: RecommendationItem[] = [
      {
        kind: "external",
        domain: "games",
        name: "Steam Machine",
        score: 0.45,
        reasons: [],
        url: "https://store.steampowered.com/app/1",
      },
      {
        kind: "external",
        domain: "games",
        name: "Steam Machine",
        score: 0.45,
        reasons: [],
        url: "https://store.steampowered.com/app/2",
      },
    ];
    expect(uniqueRecommendationItems(byAppId)).toHaveLength(2);
    expect(itemReactKey(byAppId[0]!)).toBe("game:1145360");
    expect(itemReactKey(byAppId[1]!)).toBe("game:570");
    expect(uniqueRecommendationItems(byUrl)).toHaveLength(2);
    expect(itemReactKey(byUrl[0]!)).toBe(
      "external:https://store.steampowered.com/app/1",
    );
    expect(itemReactKey(byUrl[1]!)).toBe(
      "external:https://store.steampowered.com/app/2",
    );
  });

  it("still collapses genuinely identical same-name items", () => {
    const items: RecommendationItem[] = [
      {
        kind: "game",
        domain: "games",
        name: "Hades",
        score: 0.9,
        reasons: [],
      },
      {
        kind: "game",
        domain: "games",
        name: "Hades",
        score: 0.8,
        reasons: [],
      },
    ];
    expect(uniqueRecommendationItems(items)).toHaveLength(1);
    expect(itemReactKey(items[0]!)).toBe("game:Hades");
  });
});
