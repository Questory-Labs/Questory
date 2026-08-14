"use client";

import { useResource } from "@questorylabs/qhttp/react";
import type { SearchResult } from "@questorylabs/shared";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { SEARCH_PALETTE_DEBOUNCE_MS, SEARCH_PALETTE_LIMIT } from "@/lib/search";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { searchResultItems } from "./SearchResults";

export type SearchPaletteItem = ReturnType<typeof searchResultItems>[number];

export function useSearchPalette(query: string, enabled: boolean) {
  const [debounced, setDebounced] = useState("");
  const { showMusicNav } = useMusicEnabled();
  const { enabled: showWatchNav } = useWatchEnabled();
  const { showReadNav } = useReadEnabled();

  useEffect(() => {
    const next = query.trim();
    if (!next) {
      setDebounced("");
      return;
    }
    const timer = window.setTimeout(
      () => setDebounced(next),
      SEARCH_PALETTE_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [query]);

  const result = useResource({
    id: ["search", "palette", debounced],
    load: () =>
      api<SearchResult>(
        `/search?q=${encodeURIComponent(debounced)}&limit=${SEARCH_PALETTE_LIMIT}`,
      ),
    when: enabled && debounced.length > 0,
  });

  const items = useMemo(() => {
    const raw = searchResultItems(result.value);
    return raw.filter((item) => {
      if (item.group === "Artists" || item.group === "Albums" || item.group === "Tracks") {
        return showMusicNav;
      }
      if (item.group === "Movies" || item.group === "Shows") {
        return showWatchNav;
      }
      if (item.group === "Reads") {
        return showReadNav;
      }
      return true;
    });
  }, [result.value, showMusicNav, showReadNav, showWatchNav]);

  const groups = useMemo(() => {
    const map = new Map<string, SearchPaletteItem[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [items]);

  return { debounced, result, items, groups };
}
