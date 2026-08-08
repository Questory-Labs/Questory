"use client";

import { Command } from "cmdk";
import { useQuery } from "@questorylabs/qhttp/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { SearchResult } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useGlobalSearch } from "./GlobalSearchProvider";
import { searchResultItems } from "./SearchResults";

export function GlobalSearchDialog() {
  const router = useRouter();
  const { open, setOpen, query, setQuery } = useGlobalSearch();
  const [debounced, setDebounced] = useState("");
  const { showMusicNav } = useMusicEnabled();
  const { enabled: showWatchNav } = useWatchEnabled();
  const { showReadNav } = useReadEnabled();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setDebounced("");
    }
  }, [open]);

  const result = useQuery({
    queryKey: ["search", "palette", debounced],
    queryFn: () =>
      api<SearchResult>(
        `/search?q=${encodeURIComponent(debounced)}&limit=8`,
      ),
    enabled: open && debounced.length > 0,
  });

  const items = useMemo(() => {
    const raw = searchResultItems(result.data);
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
  }, [result.data, showMusicNav, showReadNav, showWatchNav]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [items]);

  function closeAndNavigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function openFullSearch() {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setQuery("");
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global search"
      shouldFilter={false}
      overlayClassName="global-search-overlay"
      contentClassName="global-search-content"
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder='Search games, movie:godfather, artist:radiohead, within:<7d'
      />
      <Command.List>
          {debounced.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-[var(--muted)]">
              Type to search your library, friends, music, watch, and reads.
            </div>
          ) : null}
          {result.isLoading && debounced.length > 0 ? (
            <div className="px-2 py-4 text-sm text-[var(--muted)]">Searching…</div>
          ) : null}
          {result.isSuccess && debounced.length > 0 && items.length === 0 ? (
            <Command.Empty className="px-2 py-4 text-sm text-[var(--muted)]">
              No results.
            </Command.Empty>
          ) : null}
          {groups.map(([group, groupItems]) => (
            <Command.Group key={group} heading={group}>
              {groupItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.id}
                  onSelect={() => closeAndNavigate(item.href)}
                >
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
          {query.trim() ? (
            <Command.Group heading="Actions">
              <Command.Item value="view-all-results" onSelect={openFullSearch}>
                View all results for “{query.trim()}”
              </Command.Item>
            </Command.Group>
          ) : null}
        </Command.List>
      <div className="global-search-footer">
        <span>Navigate</span>
        <span>
          <kbd>↵</kbd> open · <kbd>esc</kbd> close
        </span>
      </div>
    </Command.Dialog>
  );
}
