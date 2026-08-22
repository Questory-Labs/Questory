"use client";

import { ListPager } from "@/components/ListPager";
import {
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonListRows,
  StateMessage,
} from "@/components/ui";
import type { MediaHistoryViewProps } from "./media.history.types";

export const MediaHistoryView = <TItem,>({
  recent,
  page,
  setPage,
  title,
  description,
  actions,
  emptyTitle,
  emptyDescription,
  errorMessage,
  renderItem,
}: MediaHistoryViewProps<TItem>) => {
  const items = recent.value?.items ?? [];
  const total = recent.value?.total ?? 0;
  const pageSize = recent.value?.pageSize ?? 1;

  return (
    <>
      <PageHeader title={title} description={description} actions={actions} />

      <ResourceStatus
        failed={recent.failed}
        empty={recent.empty}
        loading={<SkeletonListRows />}
        error={<StateMessage variant="error">{errorMessage}</StateMessage>}
      >
        {items.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            <ul className="space-y-3">{items.map((item) => renderItem(item))}</ul>
            <ListPager
              page={page}
              total={total}
              pageSize={pageSize}
              disabled={recent.refreshing}
              onPageChange={setPage}
            />
          </>
        )}
      </ResourceStatus>
    </>
  );
};
