"use client";

import { searchAbbr, type SearchItem } from "./search-items";
import { SEARCH_DOMAIN_COLOR } from "./search.constants";

export const SearchResultIcon = ({ item }: { item: Pick<SearchItem, "label" | "image" | "domain"> }) => {
  const color = SEARCH_DOMAIN_COLOR[item.domain];
  if (item.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image}
        alt=""
        className="size-[38px] shrink-0 rounded-xl border border-white/[0.08] object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid size-[38px] shrink-0 place-items-center rounded-xl border border-white/[0.08] text-[13px] font-normal"
      style={{
        color,
        background: `radial-gradient(circle, color-mix(in srgb, ${color} 20%, transparent) 0, transparent 70%), rgba(0,0,0,0.3)`,
      }}
    >
      {searchAbbr(item.label)}
    </span>
  );
};

export const SearchRowBody = ({ item }: { item: SearchItem }) => (
  <>
    <SearchResultIcon item={item} />
    <span className="min-w-0 flex-1">
      <span className="block truncate font-normal text-ink">{item.label}</span>
      {item.meta ? (
        <span className="block truncate text-xs text-muted">{item.meta}</span>
      ) : null}
    </span>
    <span className="label-mono shrink-0 tracking-[0.06em]">{item.kind}</span>
    <span
      aria-hidden="true"
      className="grid size-[26px] shrink-0 place-items-center rounded-full bg-white/[0.08] text-xs opacity-0 transition-[opacity,transform] duration-300 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 group-data-[selected=true]:translate-x-0 group-data-[selected=true]:opacity-100 motion-reduce:transition-none"
    >
      ↵
    </span>
  </>
);

export const SEARCH_ROW_CLASS =
  "group flex min-h-14 items-center gap-3.5 rounded-2xl px-3 py-1.5 no-underline transition-colors duration-300 hover:bg-white/[0.05] data-[selected=true]:bg-white/[0.07] data-[selected=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

export const SEARCH_GROUP_HEADING_CLASS =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-faint";
