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
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--faint)]"
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
            className="w-full border border-[var(--line)] bg-[var(--bg-1)] py-2 pl-9 pr-20 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--faint)] focus:border-[var(--line-strong)] focus:bg-[var(--bg-2)]"
          />
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center gap-1 border border-[var(--line)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--faint)] transition hover:border-[var(--line-strong)] hover:text-[var(--muted)] sm:inline-flex"
            aria-label="Open command palette"
          >
            <span>Ctrl</span>
            <span>K</span>
          </button>
          {dropdownOpen ? (
            <div className="header-search-dropdown">
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
        strokeLinecap="square"
      />
    </svg>
  );
}
