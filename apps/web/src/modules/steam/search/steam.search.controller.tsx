"use client";

import { useMemo, type PropsWithChildren } from "react";
import { useSearchParams } from "next/navigation";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { SearchResult } from "@questorylabs/shared";
import { formatSearchChips, parseSearchQuery } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";

export const SearchController = ({ children }: PropsWithChildren) => {
  const sp = useSearchParams();
  const q = sp.get("q") || "";
  const { showMusicNav } = useMusicEnabled();
  const { enabled: showWatchNav } = useWatchEnabled();
  const { showReadNav } = useReadEnabled();

  const result = useResource({
    id: ["search", q],
    load: () => api<SearchResult>(`/search?q=${encodeURIComponent(q)}`),
    when: Boolean(q),
  });

  const chips = useMemo(() => formatSearchChips(parseSearchQuery(q)), [q]);

  return cloneElements(children, {
    q,
    chips,
    result,
    showMusic: showMusicNav,
    showWatch: showWatchNav,
    showRead: showReadNav,
  });
};
