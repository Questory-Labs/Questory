import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  MusicBreakdownResponse,
  MusicHeatmap,
  MusicInsights,
  MusicPlayingNow,
  MusicRange,
  MusicTimeBucket,
} from "@questorylabs/shared";

export type MusicHomeViewProps = {
  range: MusicRange;
  setRange: (range: MusicRange) => void;
  insights: UseResourceResult<MusicInsights>;
  playing: UseResourceResult<MusicPlayingNow>;
  heatmap: UseResourceResult<MusicHeatmap>;
  daySeries: UseResourceResult<MusicTimeBucket[]>;
  hour: UseResourceResult<MusicTimeBucket[]>;
  dow: UseResourceResult<MusicTimeBucket[]>;
  years: UseResourceResult<MusicBreakdownResponse>;
  services: UseResourceResult<MusicBreakdownResponse>;
  showCalendar: boolean;
};
