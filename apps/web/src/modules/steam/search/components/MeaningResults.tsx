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

export function SearchModeToggle({ q, mode }: { q: string; mode: SearchMode }) {
  const base = `/search?q=${encodeURIComponent(q)}`;
  const tab = (active: boolean) =>
    `border px-3 py-1 text-xs font-mono ${
      active
        ? "border-[var(--ink)] text-[var(--ink)]"
        : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
    }`;
  return (
    <nav aria-label="Search mode" className="flex gap-2">
      <Link href={base} className={tab(mode === "exact")} aria-current={mode === "exact" ? "page" : undefined}>
        Exact
      </Link>
      <Link
        href={`${base}&mode=meaning`}
        className={tab(mode === "meaning")}
        aria-current={mode === "meaning" ? "page" : undefined}
      >
        By meaning
      </Link>
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
          title={<span className="text-[var(--danger)]">Search failed. Try again.</span>}
        />
      }
    >
      {!meaning.value?.available ? (
        <p className="text-sm text-[var(--muted)]">
          Meaning search is warming up. Try again in a few minutes.
        </p>
      ) : meaning.value.items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nothing in your library matched that idea.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)] border border-[var(--line)]">
          {meaning.value.items.map((item) => (
            <li key={item.key}>
              <Link
                href={meaningHref(item)}
                className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-2)]"
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 object-cover" />
                ) : (
                  <span className="h-10 w-10 shrink-0 bg-[var(--bg-2)]" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-[var(--ink)]">{item.name}</span>
                  <span className="block text-xs text-[var(--muted)]">
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
