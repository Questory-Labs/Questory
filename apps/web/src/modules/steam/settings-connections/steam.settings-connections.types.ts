import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { StoreAccountStatus, User } from "@questorylabs/shared";
import type { useSyncJobs } from "@/hooks/useSyncJobs";

export type ConnectionsViewProps = {
  justLinked: boolean;
  linkError: string | null;
  stores: UseResourceResult<StoreAccountStatus[]>;
  sync: ReturnType<typeof useSyncJobs>;
  user: User | null;
  steamConnected: boolean;
  steamStatus: StoreAccountStatus | undefined;
  showMusic: boolean;
  showWatch: boolean;
  showRead: boolean;
};
