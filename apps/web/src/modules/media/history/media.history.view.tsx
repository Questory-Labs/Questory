"use client";

import { CountUp } from "@questorylabs/ui";
import { ListPager } from "@/components/ListPager";
import {
  EmptyState,
  PageHeader,
  Panel,
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
  eyebrow,
  description,
  actions,
  toolbar,
  showCount = true,
  emptyTitle,
  emptyDescription,
  errorMessage,
  listLabel = "History",
  renderItem,
}: MediaHistoryViewProps<TItem>) => {
  const items = recent.value?.items ?? [];
  const total = recent.value?.total ?? 0;
  const pageSize = recent.value?.pageSize ?? 1;
  const count =
    showCount && recent.value ? (
      <p className="m-0 text-right">
        <span className="block text-[46px] font-extralight leading-[0.9] tracking-[-0.04em]">
          <CountUp value={total} />
        </span>
        <span className="label-mono text-[10px] text-[var(--faint)]">shown</span>
      </p>
    ) : null;

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-3.5">
      <PageHeader
        className="mb-0 px-1 pb-2.5 pt-2"
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          actions || count ? (
            <div className="flex flex-wrap items-end gap-4">
              {actions}
              {count}
            </div>
          ) : undefined
        }
      />

      {toolbar ? <div className="q-in flex flex-wrap items-center gap-2.5 [--i:1]">{toolbar}</div> : null}

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
            <Panel className="q-in p-2.5 [--i:2]">
              <section aria-label={listLabel}>
                <ul className="m-0 list-none p-0">{items.map((item, i) => renderItem(item, i))}</ul>
              </section>
            </Panel>
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
    </div>
  );
};
