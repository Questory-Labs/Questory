"use client";

import { Command } from "cmdk";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { SearchResult } from "@questorylabs/shared";
import type { SearchPaletteItem } from "./useSearchPalette";

type SearchPaletteListProps = {
  query: string;
  debounced: string;
  result: UseResourceResult<SearchResult>;
  groups: Array<[string, SearchPaletteItem[]]>;
  items: SearchPaletteItem[];
  onSelect: (href: string) => void;
  onViewAll: () => void;
};

export function SearchPaletteList({
  query,
  debounced,
  result,
  groups,
  items,
  onSelect,
  onViewAll,
}: SearchPaletteListProps) {
  return (
    <Command.List>
      {debounced.length === 0 ? (
        <div className="px-2 py-6 text-center text-sm text-[var(--muted)]">
          Type to search your library, friends, music, watch, and reads.
        </div>
      ) : null}
      {result.empty && debounced.length > 0 ? (
        <div className="px-2 py-4 text-sm text-[var(--muted)]">Searching…</div>
      ) : null}
      {result.ready && debounced.length > 0 && items.length === 0 ? (
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
              onSelect={() => onSelect(item.href)}
            >
              {item.label}
            </Command.Item>
          ))}
        </Command.Group>
      ))}
      {query.trim() ? (
        <Command.Group heading="Actions">
          <Command.Item value="view-all-results" onSelect={onViewAll}>
            View all results for “{query.trim()}”
          </Command.Item>
        </Command.Group>
      ) : null}
    </Command.List>
  );
}

export function SearchPaletteFooter() {
  return (
    <div className="global-search-footer">
      <span>Navigate</span>
      <span>
        <kbd>↵</kbd> open · <kbd>esc</kbd> close
      </span>
    </div>
  );
}
