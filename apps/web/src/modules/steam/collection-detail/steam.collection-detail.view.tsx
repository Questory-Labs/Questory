"use client";

import { GameTile } from "@/components/GameTile";
import {
  Button,
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import { GAME_GRID_PAGE_SIZE } from "@/lib/pagination";
import type { CollectionDetailViewProps } from "./steam.collection-detail.types";

export const CollectionDetailView = (props: Record<string, unknown>) => {
  const { collection, page, setPage } = props as CollectionDetailViewProps;
  const total = collection.value?.total ?? 0;
  const pageSize = collection.value?.pageSize ?? GAME_GRID_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const games = collection.value?.games || [];

  return (
    <>
      <PageHeader
        title={collection.value?.name || "Collection"}
        description={
          collection.value
            ? `${collection.value.total} games${collection.value.description ? ` · ${collection.value.description}` : collection.value.type ? ` · ${collection.value.type}` : ""}`
            : undefined
        }
      />
      <ResourceStatus
        failed={collection.failed}
        empty={collection.empty}
        loading={<SkeletonTileGrid count={8} />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load collection.
              </span>
            }
          />
        }
      >
        {games.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {games.map((g) => (
              <GameTile
                key={g.appId}
                name={g.name}
                headerImage={g.headerImage}
                meta={g.genres.slice(0, 2).join(", ")}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No games in this collection." />
        )}
      </ResourceStatus>

      {total > pageSize && (
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5"
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
};
