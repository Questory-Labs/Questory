"use client";

import { useQuery } from "@questorylabs/qhttp/react";
import { PageHeader } from "@/components/ui";
import { SearchResults, isSearchEmpty } from "@/components/search/SearchResults";
import { SearchTips } from "@/components/search/SearchTips";
import { api } from "@/lib/api";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import type { SearchResult } from "@questorylabs/shared";
import { formatSearchChips, parseSearchQuery } from "@questorylabs/shared";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

function SearchInner() {
  const sp = useSearchParams();
  const q = sp.get("q") || "";
  const { showMusicNav } = useMusicEnabled();
  const { enabled: showWatchNav } = useWatchEnabled();
  const { showReadNav } = useReadEnabled();

  const result = useQuery({
    queryKey: ["search", q],
    queryFn: () => api<SearchResult>(`/search?q=${encodeURIComponent(q)}`),
    enabled: Boolean(q),
  });

  const chips = useMemo(() => formatSearchChips(parseSearchQuery(q)), [q]);

  return (
    <>
      <PageHeader
        title="Search"
        description={q ? `Results for “${q}”` : "Search your library and media"}
      />

      <div className="space-y-6">
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="border border-[var(--line)] px-2 py-1 font-mono text-xs text-[var(--muted)]"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {!q ? (
          <p className="text-sm text-[var(--muted)]">
            Use the header search or press Ctrl+K to find games, friends, music,
            movies, shows, and reads.
          </p>
        ) : null}

        {result.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Searching…</p>
        ) : null}

        {result.isError ? (
          <p className="text-sm text-[var(--muted)]">Search failed. Try again.</p>
        ) : null}

        {q && result.data && isSearchEmpty(result.data) ? (
          <p className="text-sm text-[var(--muted)]">No results found.</p>
        ) : null}

        {result.data && !isSearchEmpty(result.data) ? (
          <SearchResults
            data={result.data}
            showMusic={showMusicNav}
            showWatch={showWatchNav}
            showRead={showReadNav}
          />
        ) : null}

        {q && result.data && isSearchEmpty(result.data) && !result.isLoading ? (
          <p className="text-sm text-[var(--muted)]">
            Try a scope like{" "}
            <code className="text-[var(--ink)]">game:</code>,{" "}
            <code className="text-[var(--ink)]">movie:</code>, or{" "}
            <code className="text-[var(--ink)]">artist:</code>.
          </p>
        ) : null}

        <SearchTips />
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
