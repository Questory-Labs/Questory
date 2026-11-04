import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  MusicBreakdownResponse,
  MusicHeatmap,
  MusicInsights,
  MusicOverview,
  MusicPlayingNow,
  MusicRange,
  MusicTimeBucket,
  MusicTopsResponse,
} from "@questorylabs/shared";

export type MusicHomeViewProps = {
  range: MusicRange;
  setRange: (range: MusicRange) => void;
  insights: UseResourceResult<MusicInsights>;
  playing: UseResourceResult<MusicPlayingNow>;
  overview: UseResourceResult<MusicOverview>;
  topArtists: UseResourceResult<MusicTopsResponse>;
  dailyTarget: UseResourceResult<{ target: number | null }>;
  heatmap: UseResourceResult<MusicHeatmap>;
  daySeries: UseResourceResult<MusicTimeBucket[]>;
  hour: UseResourceResult<MusicTimeBucket[]>;
  dow: UseResourceResult<MusicTimeBucket[]>;
  years: UseResourceResult<MusicBreakdownResponse>;
  services: UseResourceResult<MusicBreakdownResponse>;
  showCalendar: boolean;
};
