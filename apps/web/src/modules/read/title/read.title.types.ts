import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { ReadTitleDetail } from "@questorylabs/shared";

export type ReadTitleViewProps = {
  id: string;
  detail: UseResourceResult<ReadTitleDetail>;
  saveBusy: boolean;
  onSave: (values: {
    displayName: string;
    coverUrl: string;
  }) => Promise<void>;
};
