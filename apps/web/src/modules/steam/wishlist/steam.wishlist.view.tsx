"use client";

import { StoreChipRow } from "@/components/StoreChipRow";
import { useUser } from "@/hooks/useUser";
import { WISHLIST_PAGE_SIZE } from "@/lib/pagination";
import {
  Button,
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonListRows,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import { DealAlerts } from "./components/DealAlerts";
import { RecsShelf } from "./components/RecsShelf";
import { WishlistTable } from "./components/WishlistTable";
import type { WishlistViewProps } from "./steam.wishlist.types";

export const WishlistView = (props: Record<string, unknown>) => {
  const {
    list,
    recommendations,
    deals,
    storeFilter,
    setStoreFilter,
    page,
    setPage,
    editing,
    target,
    setTarget,
    startEdit,
    stopEdit,
    update,
    filteredRecs,
    filteredDeals,
  } = props as WishlistViewProps;

  const { user } = useUser();
  const currency = user?.currency || "USD";
  const total = list.value?.total ?? 0;
  const pageSize = list.value?.pageSize ?? WISHLIST_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = list.value?.items ?? [];
  const dealList = filteredDeals ?? [];
  const recList = filteredRecs ?? [];

  return (
    <>
      <PageHeader
        title="Wishlist"
        description={
          list.value
            ? `${total} games · should-buy scores, price targets, and deal signals across Steam, Epic, and GOG`
            : "Should-buy scores, price targets, and deal signals across Steam, Epic, and GOG"
        }
      />

      <StoreChipRow value={storeFilter} onChange={setStoreFilter} />

      <ResourceStatus
        failed={deals.failed}
        empty={deals.empty}
        loading={<SkeletonTileGrid count={3} className="mt-8" />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load deal alerts.
              </span>
            }
          />
        }
      >
        {dealList.length > 0 ? (
          <DealAlerts deals={dealList} currency={currency} />
        ) : null}
      </ResourceStatus>

      <ResourceStatus
        failed={recommendations.failed}
        empty={recommendations.empty}
        loading={<SkeletonTileGrid count={4} className="mt-10" />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load recommended buys.
              </span>
            }
          />
        }
      >
        {recList.length > 0 ? <RecsShelf recs={recList} /> : null}
      </ResourceStatus>

      <ResourceStatus
        failed={list.failed}
        empty={list.empty}
        loading={<SkeletonListRows count={6} className="mt-10" />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load wishlist.
              </span>
            }
          />
        }
      >
        {items.length ? (
          <>
            <WishlistTable
              items={items}
              currency={currency}
              editing={editing}
              target={target}
              setTarget={setTarget}
              startEdit={startEdit}
              stopEdit={stopEdit}
              update={update}
            />
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
        ) : (
          <EmptyState title="No wishlist games match this store filter." />
        )}
      </ResourceStatus>
    </>
  );
};
