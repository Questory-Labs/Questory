import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  ReadBreakdownResponse,
  ReadInsights,
  ReadLibraryPage,
  ReadRange,
  ReadTimeBucket,
  SourcesOverview,
} from "@questorylabs/shared";

export type ReadHomeViewProps = {
  range: ReadRange;
  setRange: (range: ReadRange) => void;
  insights: UseResourceResult<ReadInsights>;
  hour: UseResourceResult<ReadTimeBucket[]>;
  dow: UseResourceResult<ReadTimeBucket[]>;
  formats: UseResourceResult<ReadBreakdownResponse>;
  sources: UseResourceResult<ReadBreakdownResponse>;
  reading: UseResourceResult<ReadLibraryPage>;
  overview: UseResourceResult<SourcesOverview>;
};
