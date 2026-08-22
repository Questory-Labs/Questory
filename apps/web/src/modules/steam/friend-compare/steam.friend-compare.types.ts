import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { FriendCompare } from "@questorylabs/shared";

export type FriendCompareViewProps = {
  compare: UseResourceResult<FriendCompare>;
};
