import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  MusicBreakdownResponse,
  MusicMoversResponse,
  MusicRange,
  MusicTopsResponse,
} from "@questorylabs/shared";
import type { TopsKind } from "./music.charts.constants";

export type MusicChartsViewProps = {
  kind: TopsKind;
  setKind: (kind: TopsKind) => void;
  range: MusicRange;
  onRangeChange: (range: MusicRange) => void;
  page: number;
  setPage: (page: number) => void;
  tops: UseResourceResult<MusicTopsResponse>;
  movers: UseResourceResult<MusicMoversResponse>;
  years: UseResourceResult<MusicBreakdownResponse>;
  services: UseResourceResult<MusicBreakdownResponse>;
};
