import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { AdminUser } from "./components/AdminUserCard";

export type AdminUsersResponse = {
  users: AdminUser[];
  startFreshEnabled?: boolean;
};

export type AdminUsersViewProps = {
  users: UseResourceResult<AdminUsersResponse>;
  msg: string | null;
  setMsg: Dispatch<SetStateAction<string | null>>;
  addOpen: boolean;
  setAddOpen: Dispatch<SetStateAction<boolean>>;
};
