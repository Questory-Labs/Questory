"use client";

import { useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { MediaHistoryPage } from "./media.history.types";

export const MediaHistoryController = <TItem,>({
  children,
  resourceKey,
  load,
}: PropsWithChildren<{
  resourceKey: string;
  load: (page: number) => Promise<MediaHistoryPage<TItem>>;
}>) => {
  const [page, setPage] = useState(1);
  const recent = useResource({
    id: [resourceKey, page],
    load: () => load(page),
  });

  return cloneElements(children, { recent, page, setPage });
};
