import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  MusicListenSource,
  MusicPlayingNow,
  MusicRecentListen,
  MusicRecentPage,
  MusicTimeBucket,
} from "@questorylabs/shared";

export type MusicListeningViewProps = {
  recent: UseResourceResult<MusicRecentPage>;
  playing: UseResourceResult<MusicPlayingNow>;
  page: number;
  setPage: (page: number) => void;
  items: MusicRecentListen[];
  query: string;
  setQuery: (query: string) => void;
  source: MusicListenSource | "all";
  setSource: (source: MusicListenSource | "all") => void;
  filtered: boolean;
  dayTotals: UseResourceResult<MusicTimeBucket[]>;
  hasOlder: boolean;
  loadOlder: () => void;
  loadingOlder: boolean;
  olderFailed: boolean;
};
