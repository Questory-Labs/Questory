import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { BacklogSummary } from "@questorylabs/shared";

export type BacklogViewProps = {
  summary: UseResourceResult<BacklogSummary>;
};
