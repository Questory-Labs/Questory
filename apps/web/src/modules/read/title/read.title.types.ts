import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { ReadTitleDetail, ReadTitleTimeseries } from "@questorylabs/shared";

export type ReadTitleLogMessage = { tone: "ok" | "error"; text: string } | null;

export type ReadTitleViewProps = {
  id: string;
  detail: UseResourceResult<ReadTitleDetail>;
  weeks?: UseResourceResult<ReadTitleTimeseries>;
  saveBusy: boolean;
  onSave: (values: {
    displayName: string;
    coverUrl: string;
  }) => Promise<void>;
  logBusy?: boolean;
  logMessage?: ReadTitleLogMessage;
  onLogChapter?: (chapter: number) => void;
};
