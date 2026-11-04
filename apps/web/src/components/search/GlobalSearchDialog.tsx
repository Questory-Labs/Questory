"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useGlobalSearch } from "./GlobalSearchProvider";
import { SearchPaletteFooter, SearchPaletteList } from "./SearchPaletteList";
import { SearchScopeTabs } from "./SearchScopeTabs";
import { groupSearchItems } from "./search-items";
import type { SearchScopeFilter } from "./search.constants";
import { useSearchPalette } from "./useSearchPalette";

export function GlobalSearchDialog() {
  const router = useRouter();
  const { open, setOpen, query, setQuery, reset } = useGlobalSearch();
  const { debounced, result, items } = useSearchPalette(query, open);
  const [scope, setScope] = useState<SearchScopeFilter>("all");

  const scopes = useMemo<SearchScopeFilter[]>(() => {
    const present = new Set(items.map((i) => i.domain));
    return ["all", ...(["games", "music", "watch", "read", "friends"] as const).filter((d) => present.has(d))];
  }, [items]);
  const activeScope = scopes.includes(scope) ? scope : "all";
  const visible = useMemo(
    () => (activeScope === "all" ? items : items.filter((i) => i.domain === activeScope)),
    [items, activeScope],
  );
  const groups = useMemo(() => groupSearchItems(visible), [visible]);

  function close() {
    setScope("all");
    reset();
  }

  function closeAndNavigate(href: string) {
    close();
    router.push(href);
  }

  function openFullSearch() {
    const q = query.trim();
    if (!q) return;
    close();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true);
        else close();
      }}
      label="Global search"
      shouldFilter={false}
      overlayClassName="fixed inset-0 z-[100] bg-[rgba(5,5,6,0.62)] backdrop-blur-[10px]"
      contentClassName="fixed left-1/2 top-[max(10vh,4rem)] z-[101] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(34,34,38,0.92),rgba(18,18,20,0.94))] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_40px_100px_-20px_rgba(0,0,0,0.9)]"
    >
      <div className="flex items-center gap-3.5 px-[22px]">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search games, movie:godfather, artist:radiohead, within:<7d"
          className="h-[68px] min-w-0 flex-1 border-0 bg-transparent text-[22px] font-light tracking-[-0.01em] text-ink outline-none placeholder:text-faint"
        />
        <kbd className="rounded-full bg-white/[0.06] px-[9px] py-1 font-mono text-[10px] text-muted">Esc</kbd>
      </div>
      {scopes.length > 2 ? (
        <div className="px-[18px] pb-3.5">
          <SearchScopeTabs scopes={scopes} value={activeScope} onChange={setScope} />
        </div>
      ) : null}
      <SearchPaletteList
        query={query}
        debounced={debounced}
        result={result}
        groups={groups}
        items={visible}
        onSelect={closeAndNavigate}
        onViewAll={openFullSearch}
      />
      <SearchPaletteFooter />
    </Command.Dialog>
  );
}
