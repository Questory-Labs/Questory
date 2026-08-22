import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { WatchTitleDetail } from "@questorylabs/shared";

export type WatchTitleViewProps = {
  id: string;
  detail: UseResourceResult<WatchTitleDetail>;
  saveBusy: boolean;
  onSave: (values: {
    displayName: string;
    coverUrl: string;
  }) => Promise<void>;
};
