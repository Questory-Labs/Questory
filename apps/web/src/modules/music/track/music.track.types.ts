import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  MusicHeatmap,
  MusicRange,
  MusicTimeBucket,
  MusicTrackDetail,
  MusicTrackListenPage,
} from "@questorylabs/shared";

export type MusicTrackViewProps = {
  id: string;
  range: MusicRange;
  onRangeChange: (range: MusicRange) => void;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  detail: UseResourceResult<MusicTrackDetail>;
  listens: UseResourceResult<MusicTrackListenPage>;
  hourSeries: UseResourceResult<MusicTimeBucket[]>;
  dowSeries: UseResourceResult<MusicTimeBucket[]>;
  heatmap: UseResourceResult<MusicHeatmap>;
  saveBusy: boolean;
  mergeBusy: boolean;
  onSave: (values: {
    trackTitle?: string;
    albumTitle?: string | null;
    artists?: Array<{ id?: string; name: string }>;
    artistName?: string;
    displayName?: string | null;
  }) => Promise<void | { trackId?: string }>;
  onMerge: (targetTrackId: string) => Promise<void | { trackId?: string }>;
  onSaved: () => void;
};
