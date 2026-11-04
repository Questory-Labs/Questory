"use client";

import { EmptyState, ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { SearchResults, isSearchEmpty } from "@/components/search/SearchResults";
import { SearchTips } from "./components/SearchTips";
import { MeaningResults, SearchModeToggle } from "./components/MeaningResults";
import { SEARCH_PAGE_SKELETON_ROWS } from "./steam.search.constants";
import type { SearchViewProps } from "./steam.search.types";

const SCOPE_CODE_CLASS =
  "rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-ink";

export const SearchView = (props: Record<string, unknown>) => {
  const { q, chips, result, showMusic, showWatch, showRead, mode, meaningAvailable, meaning } =
    props as SearchViewProps;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      <header className="q-in flex flex-wrap items-end justify-between gap-4 px-1 pt-2">
        <div className="min-w-0">
          <p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-faint">
            Library · friends · music · watch · read
          </p>
          <h1 className="mt-1.5 text-[clamp(34px,4vw,52px)] font-light leading-none tracking-[-0.035em]">
            Search
          </h1>
          <p className="mt-2 truncate text-muted">
            {q ? `Results for “${q}”` : "Search your library and media"}
          </p>
        </div>
        {meaningAvailable && q ? <SearchModeToggle q={q} mode={mode} /> : null}
      </header>

      {chips.length > 0 && mode === "exact" ? (
        <ul aria-label="Query" className="flex flex-wrap gap-1.5 px-1">
          {chips.map((chip) => (
            <li key={chip} className={SCOPE_CODE_CLASS}>
              {chip}
            </li>
          ))}
        </ul>
      ) : null}

      {!q ? (
        <p className="px-1 text-sm text-muted">
          Use the header search or press Ctrl+K to find games, friends, music, movies, shows, and
          reads.
        </p>
      ) : mode === "meaning" ? (
        <MeaningResults meaning={meaning} />
      ) : (
        <ResourceStatus
          failed={result.failed}
          empty={result.empty}
          loading={<SkeletonListRows count={SEARCH_PAGE_SKELETON_ROWS} />}
          error={
            <EmptyState
              title={<span className="text-danger">Search failed. Try again.</span>}
            />
          }
        >
          {isSearchEmpty(result.value) ? (
            <div className="panel space-y-2 px-5 py-6">
              <p className="text-sm text-muted">No results found.</p>
              <p className="text-sm text-muted">
                Try a scope like <code className={SCOPE_CODE_CLASS}>game:</code>,{" "}
                <code className={SCOPE_CODE_CLASS}>movie:</code>, or{" "}
                <code className={SCOPE_CODE_CLASS}>artist:</code>.
              </p>
            </div>
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
  );
};
