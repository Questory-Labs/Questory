"use client";

import {
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonListRows,
} from "@questorylabs/ui";
import { SearchResults, isSearchEmpty } from "@/components/search/SearchResults";
import { SearchTips } from "./components/SearchTips";
import type { SearchViewProps } from "./steam.search.types";

export const SearchView = (props: Record<string, unknown>) => {
  const { q, chips, result, showMusic, showWatch, showRead } =
    props as SearchViewProps;

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
        ) : (
          <ResourceStatus
            failed={result.failed}
            empty={result.empty}
            loading={<SkeletonListRows count={4} />}
            error={
              <EmptyState
                title={
                  <span className="text-[var(--danger)]">
                    Search failed. Try again.
                  </span>
                }
              />
            }
          >
            {isSearchEmpty(result.value) ? (
              <>
                <p className="text-sm text-[var(--muted)]">No results found.</p>
                <p className="text-sm text-[var(--muted)]">
                  Try a scope like{" "}
                  <code className="text-[var(--ink)]">game:</code>,{" "}
                  <code className="text-[var(--ink)]">movie:</code>, or{" "}
                  <code className="text-[var(--ink)]">artist:</code>.
                </p>
              </>
            ) : (
              <SearchResults
                data={result.value}
                showMusic={showMusic}
                showWatch={showWatch}
                showRead={showRead}
              />
            )}
          </ResourceStatus>
        )}

        <SearchTips />
      </div>
    </>
  );
};
