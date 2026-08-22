"use client";

import { api } from "@/lib/api";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren, useState } from "react";
import type { MigrationsResponse } from "./admin.migrations.types";

export const AdminMigrationsController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const migrations = useResource({
    id: ["admin-migrations"],
    load: () => api<MigrationsResponse>("/admin/migrations"),
    refreshEvery: 5_000,
  });

  const run = useAction({
    run: (key: string) =>
      api(`/admin/migrations/${encodeURIComponent(key)}/run`, {
        method: "POST",
      }),
    onSuccess: () => {
      store.touch(["admin-migrations"]);
    },
  });

  return cloneElements(children, {
    confirmKey,
    setConfirmKey,
    migrations,
    run,
  });
};
