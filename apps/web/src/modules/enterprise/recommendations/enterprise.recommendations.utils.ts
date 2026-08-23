import type { RecommendationItem } from "@/lib/enterprise-types";

export const itemReactKey = (item: RecommendationItem): string =>
  item.itemKey ??
  `${item.kind}:${item.gameId ?? item.titleId ?? item.artistId ?? item.trackId ?? item.appId ?? item.url ?? item.name}`;

/** First occurrence wins — duplicate extras keys must not reach the grid. */
export const uniqueRecommendationItems = (
  items: RecommendationItem[],
): RecommendationItem[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = itemReactKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
