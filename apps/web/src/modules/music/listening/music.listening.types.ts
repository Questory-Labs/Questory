import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { MusicPlayingNow, MusicRecentPage } from "@questorylabs/shared";

export type MusicListeningViewProps = {
  recent: UseResourceResult<MusicRecentPage>;
  playing: UseResourceResult<MusicPlayingNow>;
  page: number;
  setPage: (page: number) => void;
};
