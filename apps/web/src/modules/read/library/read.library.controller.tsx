"use client";

import { useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { ReadLibraryPage, ReadListStatus } from "@questorylabs/shared";
import { readFetch } from "@/lib/read";
import { MEDIA_HISTORY_PAGE_SIZE } from "@/lib/pagination";

export const ReadLibraryController = ({ children }: PropsWithChildren) => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | ReadListStatus>("");
  const [format, setFormat] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");

  const library = useResource({
    id: ["read-library", page, status, format, category, q],
    load: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(MEDIA_HISTORY_PAGE_SIZE),
      });
      if (status) params.set("status", status);
      if (format) params.set("format", format);
      if (category) params.set("category", category);
      if (q) params.set("q", q);
      return readFetch<ReadLibraryPage>(`/library?${params}`);
    },
  });

  const onSearch = () => {
    setQ(qDraft.trim());
    setPage(1);
  };

  return cloneElements(children, {
    library,
    page,
    setPage,
    status,
    setStatus,
    format,
    setFormat,
    category,
    setCategory,
    qDraft,
    setQDraft,
    onSearch,
  });
};
