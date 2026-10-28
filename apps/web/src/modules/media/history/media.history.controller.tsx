"use client";

import { useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { MediaHistoryPage } from "./media.history.types";

export const MediaHistoryController = <TItem,>({
  children,
  resourceKey,
  filterKey = "",
  extra,
  load,
}: PropsWithChildren<{
  resourceKey: string;
  filterKey?: string;
  extra?: Record<string, unknown>;
  load: (page: number) => Promise<MediaHistoryPage<TItem>>;
}>) => {
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  const page = paging.filterKey === filterKey ? paging.page : 1;
  const setPage = (next: number) => setPaging({ filterKey, page: next });
  const recent = useResource({
    id: [resourceKey, filterKey, page],
    load: () => load(page),
  });

  return cloneElements(children, { ...extra, recent, page, setPage });
};
