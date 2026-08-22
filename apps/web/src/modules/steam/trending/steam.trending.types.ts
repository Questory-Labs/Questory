import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { TrendingResponse } from "@questorylabs/shared";

export type FriendsShelf = TrendingResponse["friends"];
export type GlobalShelf = TrendingResponse["global"];
export type ChartShelf = NonNullable<TrendingResponse["concurrent"]>;

export type TrendingViewProps = {
  friends: UseResourceResult<FriendsShelf>;
  global: UseResourceResult<GlobalShelf>;
  concurrent: UseResourceResult<ChartShelf>;
  deck: UseResourceResult<ChartShelf>;
  topReleases: UseResourceResult<ChartShelf>;
  selectedAppId: number | null;
  setSelectedAppId: (appId: number | null) => void;
};
