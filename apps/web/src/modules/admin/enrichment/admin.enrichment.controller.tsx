"use client";

import { api } from "@/lib/api";
import { ADMIN_ENRICHMENT_PAGE_SIZE } from "@/lib/pagination";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren, useEffect, useState } from "react";
import type {
  Domain,
  EnrichmentResponse,
  StatusFilter,
} from "./admin.enrichment.types";

export const AdminEnrichmentController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const [domain, setDomain] = useState<Domain>("music");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [domain, status]);

  const data = useResource({
    id: ["admin-enrichment", domain, page, status],
    load: () => {
      const params = new URLSearchParams({
        domain,
        page: String(page),
        pageSize: String(ADMIN_ENRICHMENT_PAGE_SIZE),
        status,
      });
      return api<EnrichmentResponse>(`/admin/enrichment?${params}`);
    },
    refreshEvery: 15_000,
  });

  const trigger = useAction({
    run: () =>
      api("/admin/enrichment/trigger", {
        method: "POST",
        body: JSON.stringify({ action: "recover-failed-sync" }),
      }),
    onSuccess: () => {
      store.touch(["admin-enrichment"]);
    },
  });

  return cloneElements(children, {
    domain,
    setDomain,
    status,
    setStatus,
    page,
    setPage,
    data,
    trigger,
  });
};
