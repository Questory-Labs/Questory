import type { RecommendationItem } from "@/lib/enterprise-types";
import { DAY_PARTS } from "./enterprise.recommendations.constants";

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

export const dayPartLabel = (now: Date): string => {
  const hour = now.getHours();
  const part = DAY_PARTS.find((p) => hour < p.until)?.label ?? "night";
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  return `${weekday} ${part}`;
};
