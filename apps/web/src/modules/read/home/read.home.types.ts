import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  ReadBreakdownResponse,
  ReadInsights,
  ReadTimeBucket,
} from "@questorylabs/shared";

export type ReadHomeViewProps = {
  insights: UseResourceResult<ReadInsights>;
  hour: UseResourceResult<ReadTimeBucket[]>;
  dow: UseResourceResult<ReadTimeBucket[]>;
  formats: UseResourceResult<ReadBreakdownResponse>;
  sources: UseResourceResult<ReadBreakdownResponse>;
};
