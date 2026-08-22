import type { RecommendationItem } from "@/lib/enterprise-types";

export const itemReactKey = (item: RecommendationItem): string =>
  item.itemKey ??
  `${item.kind}:${item.gameId ?? item.titleId ?? item.artistId ?? item.trackId ?? item.name}`;
