"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useGlobalSearch } from "./GlobalSearchProvider";
import { SearchPaletteFooter, SearchPaletteList } from "./SearchPaletteList";
import { useSearchPalette } from "./useSearchPalette";

export function GlobalSearchDialog() {
  const router = useRouter();
  const { open, setOpen, query, setQuery, reset } = useGlobalSearch();
  const { debounced, result, items, groups } = useSearchPalette(query, open);

  function closeAndNavigate(href: string) {
    reset();
    router.push(href);
  }

  function openFullSearch() {
    const q = query.trim();
    if (!q) return;
    reset();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true);
        else reset();
      }}
      label="Global search"
      shouldFilter={false}
      overlayClassName="global-search-overlay"
      contentClassName="global-search-content"
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search games, movie:godfather, artist:radiohead, within:<7d"
      />
      <SearchPaletteList
        query={query}
        debounced={debounced}
        result={result}
        groups={groups}
        items={items}
        onSelect={closeAndNavigate}
        onViewAll={openFullSearch}
      />
      <SearchPaletteFooter />
    </Command.Dialog>
  );
}
