import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";

export type AdminUserModules = {
  games: boolean;
  music: boolean;
  watch: boolean;
  read: boolean;
};

export type AdminUserLatestSync = {
  status: string;
  type: string;
  at: string;
};

export type AdminUser = {
  id: string;
  email: string | null;
  isAdmin: boolean;
  personaName: string;
  avatarUrl?: string | null;
  steamId: string | null;
  createdAt: string;
  lastSyncedAt: string | null;
  latestSync?: AdminUserLatestSync | null;
  modules?: AdminUserModules;
};

export type SyncTarget = "music" | "movie" | "read" | "catalog" | "price";

export type ConfirmAction =
  | { kind: "role"; user: AdminUser; promote: boolean }
  | { kind: "delete"; user: AdminUser }
  | { kind: "sync"; user: AdminUser; target: SyncTarget }
  | { kind: "start-fresh"; user: AdminUser };

export type AdminUsersResponse = {
  users: AdminUser[];
  startFreshEnabled?: boolean;
  failingSyncCount?: number;
};

export type AdminUsersViewProps = {
  users: UseResourceResult<AdminUsersResponse>;
  msg: string | null;
  setMsg: Dispatch<SetStateAction<string | null>>;
  addOpen: boolean;
  setAddOpen: Dispatch<SetStateAction<boolean>>;
};
