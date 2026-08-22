import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  MusicAlbumDetail,
  MusicAlbumListenPage,
  MusicRange,
  MusicTimeBucket,
} from "@questorylabs/shared";

export type MusicAlbumViewProps = {
  id: string;
  range: MusicRange;
  onRangeChange: (range: MusicRange) => void;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  detail: UseResourceResult<MusicAlbumDetail>;
  listens: UseResourceResult<MusicAlbumListenPage>;
  hourSeries: UseResourceResult<MusicTimeBucket[]>;
  dowSeries: UseResourceResult<MusicTimeBucket[]>;
  saveBusy: boolean;
  onSave: (values: {
    albumTitle?: string | null;
    artists?: Array<{ id?: string; name: string }>;
    displayName?: string | null;
  }) => Promise<void | { trackId?: string }>;
};
