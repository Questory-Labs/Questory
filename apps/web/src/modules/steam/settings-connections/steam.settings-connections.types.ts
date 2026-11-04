import type {
  UseActionResult,
  UseResourceResult,
} from "@questorylabs/qhttp/react";
import type {
  ConnectionsOverview,
  QmonitorDeviceList,
  SourcesOverview,
  StoreAccountStatus,
  User,
} from "@questorylabs/shared";
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
  connections: UseResourceResult<ConnectionsOverview>;
  sources: UseResourceResult<SourcesOverview>;
  devices: UseResourceResult<QmonitorDeviceList>;
  revokeDevice: UseActionResult<unknown, string>;
  revokeError: string | null;
};
