import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  WatchBreakdownResponse,
  WatchContinueResponse,
  WatchInsights,
  WatchTimeBucket,
  WatchTopItem,
} from "@questorylabs/shared";

export type WatchMediaFilter = "all" | "movie" | "show";

export type WatchHomeViewProps = {
  media: WatchMediaFilter;
  setMedia: (media: WatchMediaFilter) => void;
  insights: UseResourceResult<WatchInsights>;
  hour: UseResourceResult<WatchTimeBucket[]>;
  dow: UseResourceResult<WatchTimeBucket[]>;
  years: UseResourceResult<WatchBreakdownResponse>;
  sources: UseResourceResult<WatchBreakdownResponse>;
  tops: UseResourceResult<WatchTopItem[]>;
  continuing: UseResourceResult<WatchContinueResponse>;
};
