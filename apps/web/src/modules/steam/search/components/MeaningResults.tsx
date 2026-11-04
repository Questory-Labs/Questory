"use client";

import Link from "next/link";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import { EmptyState, ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import type { SemanticSearchItem, SemanticSearchResult } from "@/lib/enterprise-api";
import {
  musicArtistHref,
  readTitleHref,
  watchTitleHref,
} from "@/components/search/search-links";
import { SEARCH_ROW_CLASS, SearchResultIcon } from "@/components/search/SearchRowBody";
import type { SearchMode } from "../steam.search.types";

const DOMAIN_LABEL: Record<SemanticSearchItem["domain"], string> = {
  games: "Game",
  music: "Artist",
  watch: "Watch",
  read: "Read",
};

export function meaningHref(item: SemanticSearchItem): string {
  switch (item.domain) {
    case "games":
      return `/library/${item.id}`;
    case "music":
      return musicArtistHref(item.id);
    case "watch":
      return watchTitleHref(item.id);
    case "read":
      return readTitleHref(item.id);
  }
}

const MODES: { value: SearchMode; label: string }[] = [
  { value: "exact", label: "Exact" },
  { value: "meaning", label: "By meaning" },
];

export function SearchModeToggle({ q, mode }: { q: string; mode: SearchMode }) {
  const base = `/search?q=${encodeURIComponent(q)}`;
  const index = Math.max(0, MODES.findIndex((m) => m.value === mode));
  return (
    <nav
      aria-label="Search mode"
      className="relative inline-grid grid-cols-2 rounded-full border border-line bg-white/[0.04] p-1"
    >
      <span
        aria-hidden="true"
        className="q-slide absolute bottom-1 left-1 top-1 w-[calc((100%-8px)/2)] rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {MODES.map((m) => {
        const active = m.value === mode;
        return (
          <Link
            key={m.value}
            href={m.value === "meaning" ? `${base}&mode=meaning` : base}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex min-h-[34px] items-center justify-center px-4 text-[13px] transition-colors duration-300 ${
              active ? "text-white" : "text-muted hover:text-ink"
            }`}
          >
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MeaningResults({ meaning }: { meaning: UseResourceResult<SemanticSearchResult> }) {
  return (
    <ResourceStatus
      failed={meaning.failed}
      empty={meaning.empty}
      loading={<SkeletonListRows count={4} />}
      error={
        <EmptyState
          title={<span className="text-danger">Search failed. Try again.</span>}
        />
      }
    >
      {!meaning.value?.available ? (
        <p className="text-sm text-muted">
          Meaning search is warming up. Try again in a few minutes.
        </p>
      ) : meaning.value.items.length === 0 ? (
        <p className="text-sm text-muted">Nothing in your library matched that idea.</p>
      ) : (
        <ul className="panel-accent p-2.5">
          {meaning.value.items.map((item, i) => (
            <li key={item.key} className="q-in" style={{ "--i": i } as React.CSSProperties}>
              <Link href={meaningHref(item)} className={SEARCH_ROW_CLASS}>
                <SearchResultIcon item={{ label: item.name, image: item.imageUrl, domain: item.domain }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-normal text-ink">{item.name}</span>
                  <span className="block text-xs text-muted">
                    {DOMAIN_LABEL[item.domain]}
                    {item.year ? ` · ${item.year}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ResourceStatus>
  );
}
