"use client";

import { api } from "@/lib/api";
import { ADMIN_CRON_PAGE_SIZE } from "@/lib/pagination";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren, useState } from "react";
import type { CronRunsResponse, CronStatus } from "./admin.cron.types";

export const AdminCronController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const [page, setPage] = useState(1);
  const status = useResource({
    id: ["admin-cron-status"],
    load: () => api<CronStatus>("/admin/cron/status"),
    refreshEvery: 10_000,
  });
  const runs = useResource({
    id: ["admin-cron-runs", page],
    load: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(ADMIN_CRON_PAGE_SIZE),
      });
      return api<CronRunsResponse>(`/admin/cron/runs?${params}`);
    },
    refreshEvery: 10_000,
  });

  const trigger = useAction({
    run: (jobName: string) =>
      api("/admin/cron/trigger", {
        method: "POST",
        body: JSON.stringify({ jobName }),
      }),
    onSuccess: () => {
      store.touch(["admin-cron-runs"]);
      store.touch(["admin-cron-status"]);
      store.touch(["admin-overview"]);
    },
  });

  return cloneElements(children, { page, setPage, status, runs, trigger });
};
