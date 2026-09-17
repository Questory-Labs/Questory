import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  MediaTrendingShelf,
  TrendingResponse,
  WeeklyDigestView,
} from "@questorylabs/shared";

export type FriendsShelf = TrendingResponse["friends"];
export type GlobalShelf = TrendingResponse["global"];
export type ChartShelf = NonNullable<TrendingResponse["concurrent"]>;

export type TrendingViewProps = {
  friends: UseResourceResult<FriendsShelf>;
  global: UseResourceResult<GlobalShelf>;
  concurrent: UseResourceResult<ChartShelf>;
  deck: UseResourceResult<ChartShelf>;
  topReleases: UseResourceResult<ChartShelf>;
  showMusic: boolean;
  showWatch: boolean;
  showRead: boolean;
  showEnterprise: boolean;
  music?: UseResourceResult<MediaTrendingShelf>;
  watch?: UseResourceResult<MediaTrendingShelf>;
  read?: UseResourceResult<MediaTrendingShelf>;
  digest?: UseResourceResult<WeeklyDigestView>;
  selectedAppId: number | null;
  setSelectedAppId: (appId: number | null) => void;
};
