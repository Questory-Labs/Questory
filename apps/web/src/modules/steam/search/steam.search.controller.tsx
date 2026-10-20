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
import { semanticSearch } from "@/lib/enterprise-api";
import { useEnterpriseEnabled } from "@/providers/EnterpriseEnabledProvider";

export const SearchController = ({ children }: PropsWithChildren) => {
  const sp = useSearchParams();
  const q = sp.get("q") || "";
  const { showMusicNav } = useMusicEnabled();
  const { enabled: showWatchNav } = useWatchEnabled();
  const { showReadNav } = useReadEnabled();
  const { enabled: meaningAvailable } = useEnterpriseEnabled();
  const mode = meaningAvailable && sp.get("mode") === "meaning" ? "meaning" : "exact";

  const result = useResource({
    id: ["search", q],
    load: () => api<SearchResult>(`/search?q=${encodeURIComponent(q)}`),
    when: Boolean(q) && mode === "exact",
  });

  const meaning = useResource({
    id: ["search-meaning", q],
    load: () => semanticSearch(q),
    when: Boolean(q) && mode === "meaning",
  });

  const chips = useMemo(() => formatSearchChips(parseSearchQuery(q)), [q]);

  return cloneElements(children, {
    q,
    chips,
    result,
    showMusic: showMusicNav,
    showWatch: showWatchNav,
    showRead: showReadNav,
    mode,
    meaningAvailable,
    meaning,
  });
};
