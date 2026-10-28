import type { Dispatch, SetStateAction } from "react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  ScraperIterationRecord,
  ScraperProviderDetail,
  ScraperProviderSummary,
} from "@questorylabs/shared";

export type ScraperProviderRow = ScraperProviderSummary & {
  publishedVersion?: number | null;
  publishedAt?: string | null;
};

export type AdminScrapersViewProps = {
  providerKey: string;
  setProviderKey: Dispatch<SetStateAction<string>>;
  viewIterationId: string | null;
  setViewIterationId: Dispatch<SetStateAction<string | null>>;
  providers: UseResourceResult<ScraperProviderRow[]>;
  detail: UseResourceResult<ScraperProviderDetail>;
  toggleEnabled: UseActionResult<ScraperProviderDetail, boolean>;
  viewing: ScraperIterationRecord | null;
  viewingReadOnly: boolean;
};
