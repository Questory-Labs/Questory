import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { NavCounts, StoreAccountStatus } from "@questorylabs/shared";

export type StoresSettingsViewProps = {
  stores: UseResourceResult<StoreAccountStatus[]>;
  navCounts: UseResourceResult<NavCounts>;
};
