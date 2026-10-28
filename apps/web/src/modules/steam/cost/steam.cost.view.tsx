"use client";

import { ListPager } from "@/components/ListPager";
import { COST_ROI_PAGE_SIZE } from "@/lib/pagination";
import type { CostRoiPage } from "@questorylabs/shared";
import {
  EmptyState,
  ResourceStatus,
  SkeletonListRows,
  SkeletonStatGrid,
} from "@questorylabs/ui";
import { CostGameList } from "./components/CostGameList";
import { CostHero } from "./components/CostHero";
import { CostIdleList } from "./components/CostIdleList";
import { CostRanking } from "./components/CostRanking";
import { CostValueShares } from "./components/CostValueShares";
import type { CostViewProps } from "./steam.cost.types";
import { roiEmptyMessage } from "./steam.cost.utils";

const dangerEmpty = (title: string) => (
  <EmptyState
    title={<span className="text-[var(--danger)]">{title}</span>}
  />
);

export const CostView = (props: Record<string, unknown>) => {
  const {
    summary,
    roi,
    sort,
    setSort,
    valueTab,
    setValueTab,
    page,
    setPage,
    refreshPrices,
  } = props as CostViewProps;

  const s = summary.value;
  const currency = s?.currency || "USD";
  const roiPage: CostRoiPage | undefined = roi.value;
  const rankOffset =
    ((roiPage?.page ?? page) - 1) * (roiPage?.pageSize ?? COST_ROI_PAGE_SIZE);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <header className="q-in flex flex-wrap items-end justify-between gap-4 px-1 pb-1 pt-2">
        <div>
          <p className="label-mono text-[var(--faint)]">
            What your library is worth today, and what each hour cost you
          </p>
          <h1 className="font-display mt-1.5 text-[clamp(34px,4vw,52px)] font-light leading-none tracking-[-0.035em]">
            Library cost,{" "}
            <em className="font-serif font-normal text-[var(--muted)]">hour by hour</em>
          </h1>
        </div>
        {refreshPrices ? (
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              disabled={refreshPrices.busy}
              onClick={() => refreshPrices.submit()}
              className="min-h-11 rounded-full border border-white/[0.12] bg-white/[0.03] px-[18px] text-sm text-[var(--ink)] hover:border-white/25 disabled:opacity-60"
            >
              {refreshPrices.busy ? "Refreshing prices…" : "Refresh prices"}
            </button>
            {refreshPrices.failed ? (
              <p role="alert" className="text-xs text-[var(--danger)]">
                Could not refresh prices.
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      <ResourceStatus
        failed={summary.failed}
        empty={summary.empty}
        loading={<SkeletonStatGrid count={4} />}
        error={dangerEmpty("Could not load cost summary.")}
      >
        {s ? <CostHero summary={s} /> : null}
      </ResourceStatus>

      {s ? (
        <div className="flex flex-wrap gap-3.5">
          <CostValueShares summary={s} />
          <CostIdleList summary={s} />
        </div>
      ) : null}

      <CostRanking
        sort={sort}
        setSort={setSort}
        valueTab={valueTab}
        setValueTab={setValueTab}
      >
        <ResourceStatus
          failed={roi.failed}
          empty={roi.empty}
          loading={<SkeletonListRows />}
          error={dangerEmpty("Could not load value rankings.")}
        >
          <>
            <CostGameList
              rows={roiPage?.items ?? []}
              currency={currency}
              emptyMessage={roiEmptyMessage(roiPage?.total ?? 0, valueTab)}
              rankOffset={rankOffset}
            />
            <ListPager
              page={page}
              total={roiPage?.total ?? 0}
              pageSize={roiPage?.pageSize ?? COST_ROI_PAGE_SIZE}
              disabled={roi.refreshing}
              onPageChange={setPage}
            />
          </>
        </ResourceStatus>
      </CostRanking>
    </div>
  );
};
