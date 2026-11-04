import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { WatchCatalogLog, WatchTitleDetail } from "@questorylabs/shared";

export type WatchTitleMarkMessage = { tone: "ok" | "error"; text: string } | null;

export type WatchTitleViewProps = {
  id: string;
  detail: UseResourceResult<WatchTitleDetail>;
  saveBusy: boolean;
  onSave: (values: {
    displayName: string;
    coverUrl: string;
  }) => Promise<void>;
  markBusy?: boolean;
  markMessage?: WatchTitleMarkMessage;
  onMark?: (body: WatchCatalogLog) => void;
};
