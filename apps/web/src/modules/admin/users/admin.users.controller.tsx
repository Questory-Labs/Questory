"use client";

import { api } from "@/lib/api";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren, useState } from "react";
import type { AdminUsersResponse } from "./admin.users.types";

export const AdminUsersController = ({ children }: PropsWithChildren) => {
  const [msg, setMsg] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const users = useResource({
    id: ["admin-users"],
    load: () => api<AdminUsersResponse>("/admin/users"),
  });

  return cloneElements(children, { users, msg, setMsg, addOpen, setAddOpen });
};
