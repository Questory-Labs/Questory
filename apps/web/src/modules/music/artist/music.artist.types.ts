import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  MusicArtistDetail,
  MusicRange,
  MusicTimeBucket,
} from "@questorylabs/shared";

export type MusicArtistViewProps = {
  id: string;
  range: MusicRange;
  setRange: Dispatch<SetStateAction<MusicRange>>;
  detail: UseResourceResult<MusicArtistDetail>;
  hours: UseResourceResult<MusicTimeBucket[]>;
  saveBusy: boolean;
  onSave: (values: {
    artists?: Array<{ id?: string; name: string }>;
    displayName?: string | null;
  }) => Promise<void | { trackId?: string }>;
};
