"use client";

import { api } from "@/lib/api";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import type {
  ScraperProviderDetail,
  ScraperProviderSummary,
} from "@questorylabs/shared";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren, useEffect, useState } from "react";

export const AdminScrapersController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const [providerKey, setProviderKey] = useState<string>("letterboxd");
  const [viewIterationId, setViewIterationId] = useState<string | null>(null);

  const providers = useResource({
    id: ["admin-scraper-providers"],
    load: () => api<ScraperProviderSummary[]>("/admin/scrapers/providers"),
  });

  const detail = useResource({
    id: ["admin-scraper-provider", providerKey],
    load: () =>
      api<ScraperProviderDetail>(`/admin/scrapers/providers/${providerKey}`),
    when: Boolean(providerKey),
  });

  const toggleEnabled = useAction({
    run: (enabled: boolean) =>
      api<ScraperProviderDetail>(`/admin/scrapers/providers/${providerKey}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      store.touch(["admin-scraper-provider", providerKey]);
      store.touch(["admin-scraper-providers"]);
    },
  });

  useEffect(() => {
    if (!providerKey && providers.value?.length) {
      setProviderKey(providers.value[0].key);
    }
  }, [providers.value, providerKey]);

  useEffect(() => {
    if (!detail.value) return;
    if (detail.value.openIteration) {
      setViewIterationId(detail.value.openIteration.id);
      return;
    }
    if (detail.value.current) {
      setViewIterationId(detail.value.current.id);
    }
  }, [detail.value]);

  const viewing =
    detail.value?.current?.id === viewIterationId
      ? detail.value.current
      : detail.value?.previous.find((row) => row.id === viewIterationId) ??
        detail.value?.current ??
        null;

  const viewingReadOnly = Boolean(
    viewing &&
      viewing.id !== detail.value?.openIteration?.id &&
      (viewing.status === "published" || viewing.status === "archived"),
  );

  return cloneElements(children, {
    providerKey,
    setProviderKey,
    viewIterationId,
    setViewIterationId,
    providers,
    detail,
    toggleEnabled,
    viewing,
    viewingReadOnly,
  });
};
