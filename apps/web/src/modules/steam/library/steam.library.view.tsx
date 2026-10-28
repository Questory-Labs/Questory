"use client";

import Link from "next/link";
import type { LibrarySort } from "@questorylabs/shared";
import { StoreChipRow } from "@/components/StoreChipRow";
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  Button,
  EmptyState,
  ResourceStatus,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import { LIBRARY_PAGE_SIZE } from "@/lib/pagination";
import { LibraryFilters } from "./components/LibraryFilters";
import { LibraryGameCard } from "./components/LibraryGameCard";
import { LibraryShelves } from "./components/LibraryShelves";
import { LibraryStatusChips } from "./components/LibraryStatusChips";
import { LibraryTable } from "./components/LibraryTable";
import {
  LIBRARY_LAYOUT_OPTIONS,
  LIBRARY_SORT_OPTIONS,
} from "./steam.library.constants";
import type { LibraryViewProps } from "./steam.library.types";

export const LibraryView = (props: Record<string, unknown>) => {
  const {
    library,
    sync,
    activeStore,
    setStore,
    q,
    setQ,
    genre,
    setGenre,
    unplayed,
    setUnplayed,
    multiplayer,
    setMultiplayer,
    deck,
    setDeck,
    page,
    setPage,
    status = "all",
    setStatus,
    sort = "lastPlayed",
    setSort,
    layout = "grid",
    setLayout,
    collections,
  } = props as LibraryViewProps;

  const items = library.value?.items || [];
  const total = library.value?.total ?? 0;
  const facets = library.value?.facets;
  const currency = library.value?.currency || "USD";
  const pageSize = library.value?.pageSize ?? LIBRARY_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const headline = facets?.all ?? total;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <header className="q-in flex flex-wrap items-end justify-between gap-4 px-1 pb-1 pt-2">
        <div>
          <p className="label-mono text-[var(--faint)]">
            {sync.active
              ? `Syncing · ${sync.doneCount}/${sync.total}${
                  sync.current ? ` · ${sync.current.label}` : ""
                }`
              : "Library"}
          </p>
          <h1 className="font-display mt-1.5 text-[clamp(34px,4vw,52px)] font-light leading-none tracking-[-0.035em]">
            {headline} games
            {facets ? (
              <>
                ,{" "}
                <span className="font-serif text-[var(--muted)]">
                  {facets.neverPlayed} untouched
                </span>
              </>
            ) : null}
          </h1>
        </div>
        {setLayout ? (
          <SegmentedControl
            label="View"
            value={layout}
            onChange={setLayout}
            options={LIBRARY_LAYOUT_OPTIONS}
          />
        ) : null}
      </header>

      <div className="q-in flex flex-wrap items-center gap-2" style={{ ["--i" as string]: 1 }}>
        {setStatus ? (
          <LibraryStatusChips
            value={status}
            facets={facets}
            onChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
          />
        ) : null}
        <label className="ml-auto flex min-h-11 items-center gap-2 rounded-full border border-white/[0.08] bg-black/25 px-4 text-[var(--muted)]">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="sr-only">Filter games</span>
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Filter by name, tag or publisher"
            className="w-[220px] max-w-full border-0 bg-transparent text-sm text-[var(--ink)] outline-none"
          />
        </label>
        {setSort ? (
          <label className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/25 px-3.5 text-[13px] text-[var(--muted)]">
            Sort
            <select
              value={sort}
              onChange={(e) => {
                setPage(1);
                setSort(e.target.value as LibrarySort);
              }}
              className="border-0 bg-transparent text-[13px] text-[var(--ink)] outline-none"
            >
              {LIBRARY_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {collections?.value ? <LibraryShelves collections={collections.value} /> : null}

      <div className="flex flex-col gap-3">
        <StoreChipRow value={activeStore} onChange={setStore} />
        <LibraryFilters
          genre={genre}
          unplayed={unplayed}
          multiplayer={multiplayer}
          deck={deck}
          onGenreChange={(value) => {
            setPage(1);
            setGenre(value);
          }}
          onUnplayedChange={(value) => {
            setPage(1);
            setUnplayed(value);
          }}
          onMultiplayerChange={(value) => {
            setPage(1);
            setMultiplayer(value);
          }}
          onDeckChange={(value) => {
            setPage(1);
            setDeck(value);
          }}
        />
      </div>

      <ResourceStatus
        failed={library.failed}
        empty={library.empty}
        loading={<SkeletonTileGrid count={12} className="mb-6" />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load library.
              </span>
            }
          />
        }
      >
        {items.length === 0 ? (
          <EmptyState
            title={
              sync.active
                ? "Steam library sync is still running…"
                : "No games match these filters."
            }
            description={
              sync.active ? (
                <span className="text-[var(--muted)]">
                  {sync.current
                    ? `${sync.current.label} in progress`
                    : "Games will appear here as the sync finishes."}
                </span>
              ) : (
                <Link
                  href="/settings/connections"
                  className="text-[var(--accent)] hover:underline"
                >
                  Check Connections
                </Link>
              )
            }
          />
        ) : (
          <>
            {layout === "table" ? (
              <LibraryTable items={items} currency={currency} />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
                {items.map((item, i) => (
                  <LibraryGameCard
                    key={item.game.id}
                    entry={item}
                    currency={currency}
                    index={i}
                  />
                ))}
              </div>
            )}

            {library.value && library.value.total > library.value.pageSize && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5"
                >
                  Previous
                </Button>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </ResourceStatus>
    </div>
  );
};
