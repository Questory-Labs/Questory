"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGlobalSearch } from "./GlobalSearchProvider";
import { SearchPaletteFooter, SearchPaletteList } from "./SearchPaletteList";
import { useSearchPalette } from "./useSearchPalette";

export function HeaderSearch() {
  const router = useRouter();
  const { open: dialogOpen, setOpen: setDialogOpen, query, setQuery, reset } =
    useGlobalSearch();
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const dropdownOpen = focused && !dialogOpen;
  const { debounced, result, items, groups } = useSearchPalette(
    query,
    dropdownOpen,
  );

  const resetSearch = useCallback(() => {
    setFocused(false);
    reset();
    const input = rootRef.current?.querySelector("input");
    input?.blur();
  }, [reset]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) resetSearch();
    };
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
    };
  }, [dropdownOpen, resetSearch]);

  function closeAndNavigate(href: string) {
    resetSearch();
    router.push(href);
  }

  function openFullSearch() {
    const q = query.trim();
    if (!q) return;
    resetSearch();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (dropdownOpen) return;
    openFullSearch();
  }

  return (
    <form
      className="ml-auto min-w-0 max-w-xl flex-1 sm:ml-0"
      onSubmit={submitSearch}
    >
      <Command
        shouldFilter={false}
        label="Search library"
        className="header-search w-full"
      >
        <div className="relative" ref={rootRef}>
          <span
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted"
            aria-hidden
          >
            <SearchIcon />
          </span>
          <Command.Input
            value={query}
            onValueChange={setQuery}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              e.preventDefault();
              e.stopPropagation();
              resetSearch();
            }}
            placeholder="Search games, movie:godfather, within:<7d"
            className="h-10 w-full rounded-full border border-line bg-white/[0.04] pl-10 pr-20 text-sm font-light text-ink outline-none transition-colors duration-300 placeholder:text-faint focus:border-white/20 focus:bg-black/30"
          />
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center gap-1 rounded-full bg-white/[0.06] px-[9px] py-1 font-mono text-[10px] uppercase tracking-wide text-muted transition-colors hover:bg-white/10 hover:text-ink sm:inline-flex"
            aria-label="Open command palette"
          >
            <span>Ctrl</span>
            <span>K</span>
          </button>
          {dropdownOpen ? (
            <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(34,34,38,0.96),rgba(18,18,20,0.97))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-[10px]">
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
            </div>
          ) : null}
        </div>
      </Command>
    </form>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M16 16l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
