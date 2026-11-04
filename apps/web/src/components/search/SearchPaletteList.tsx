"use client";

import { Command } from "cmdk";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { SearchResult } from "@questorylabs/shared";
import type { SearchPaletteItem } from "./useSearchPalette";
import { SEARCH_GROUP_HEADING_CLASS, SEARCH_ROW_CLASS, SearchRowBody } from "./SearchRowBody";
import { SEARCH_FILTER_HINTS } from "./search.constants";

type SearchPaletteListProps = {
  query: string;
  debounced: string;
  result: UseResourceResult<SearchResult>;
  groups: Array<[string, SearchPaletteItem[]]>;
  items: SearchPaletteItem[];
  onSelect: (href: string) => void;
  onViewAll: () => void;
};

const NOTE_CLASS = "px-3 py-6 text-center text-sm text-muted";

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
    <Command.List
      className={`max-h-[min(520px,60vh)] overflow-y-auto border-t border-white/[0.06] px-2.5 pb-2.5 pt-1 ${SEARCH_GROUP_HEADING_CLASS}`}
    >
      {debounced.length === 0 ? (
        <div className={NOTE_CLASS}>Type to search your library, friends, music, watch, and reads.</div>
      ) : null}
      {result.empty && debounced.length > 0 ? <div className={NOTE_CLASS}>Searching…</div> : null}
      {result.ready && debounced.length > 0 && items.length === 0 ? (
        <Command.Empty className={NOTE_CLASS}>No results.</Command.Empty>
      ) : null}
      {groups.map(([group, groupItems]) => (
        <Command.Group key={group} heading={group} className="py-1.5">
          {groupItems.map((item) => (
            <Command.Item
              key={item.id}
              value={item.id}
              onSelect={() => onSelect(item.href)}
              className={`${SEARCH_ROW_CLASS} cursor-pointer`}
            >
              <SearchRowBody item={item} />
            </Command.Item>
          ))}
        </Command.Group>
      ))}
      {query.trim() ? (
        <Command.Group heading="Actions" className="py-1.5">
          <Command.Item
            value="view-all-results"
            onSelect={onViewAll}
            className={`${SEARCH_ROW_CLASS} cursor-pointer text-ink`}
          >
            <span
              aria-hidden="true"
              className="grid size-[38px] shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-black/30 text-[13px]"
            >
              ↗
            </span>
            <span className="min-w-0 flex-1 truncate">View all results for “{query.trim()}”</span>
            <span className="label-mono shrink-0 tracking-[0.06em]">Search</span>
          </Command.Item>
        </Command.Group>
      ) : null}
    </Command.List>
  );
}

export function SearchPaletteFooter() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] px-[22px] py-3 text-xs text-muted">
      <span className="flex flex-wrap items-center gap-1.5">
        Filters
        {SEARCH_FILTER_HINTS.map((f) => (
          <code
            key={f}
            className="rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-ink"
          >
            {f}
          </code>
        ))}
      </span>
      <span className="ml-auto font-mono text-[10px] text-faint">↑↓ move · ↵ open · esc close</span>
    </div>
  );
}
