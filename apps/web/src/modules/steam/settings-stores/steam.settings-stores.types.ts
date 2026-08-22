import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { StoreAccountStatus } from "@questorylabs/shared";

export type StoresSettingsViewProps = {
  stores: UseResourceResult<StoreAccountStatus[]>;
};
