"use client";

import Link from "next/link";
import { GameTile } from "@/components/GameTile";
import { StoreBadgeRow } from "@/components/StoreBadge";
import { StoreChipRow } from "@/components/StoreChipRow";
import {
  Button,
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import { LIBRARY_PAGE_SIZE } from "@/lib/pagination";
import { LibraryFilters } from "./components/LibraryFilters";
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
  } = props as LibraryViewProps;

  const items = library.value?.items || [];
  const total = library.value?.total ?? 0;
  const pageSize = library.value?.pageSize ?? LIBRARY_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Library"
        description={
          sync.active
            ? `Syncing · ${sync.doneCount}/${sync.total}${
                sync.current ? ` · ${sync.current.label}` : ""
              }`
            : `${total} games`
        }
        actions={
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search games"
            className="rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm outline-none"
          />
        }
      />

      <div className="mb-4">
        <StoreChipRow value={activeStore} onChange={setStore} />
      </div>

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item, i) => {
                const stores = item.stores || item.game.stores || [];
                return (
                  <Link
                    key={item.game.id}
                    href={`/library/${item.game.id}`}
                    className="block h-full"
                  >
                    <GameTile
                      name={item.game.name}
                      headerImage={item.game.headerImage}
                      meta={`${Math.round(item.playtimeForever / 60)}h · ${item.game.genres.slice(0, 2).join(", ") || "—"}`}
                      index={i}
                      corner={
                        stores.length ? (
                          <StoreBadgeRow stores={stores} />
                        ) : undefined
                      }
                    />
                  </Link>
                );
              })}
            </div>

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
    </>
  );
};
