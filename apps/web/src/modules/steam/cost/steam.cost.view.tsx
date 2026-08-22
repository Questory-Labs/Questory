"use client";

import { COST_ROI_PAGE_SIZE } from "@/lib/pagination";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { CostRoiPage } from "@questorylabs/shared";
import {
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonListRows,
  SkeletonStatGrid,
} from "@questorylabs/ui";
import { CostMixCharts } from "./components/CostMixCharts";
import { CostSummaryStats } from "./components/CostSummaryStats";
import { RoiList } from "./components/RoiList";
import { RoiPagination } from "./components/RoiPagination";
import { ValueTabs } from "./components/ValueTabs";
import type { CostViewProps, ValueTab } from "./steam.cost.types";

const dangerEmpty = (title: string) => (
  <EmptyState
    title={<span className="text-[var(--danger)]">{title}</span>}
  />
);

const roiEmptyMessage = (
  roi: UseResourceResult<CostRoiPage>,
  tab: ValueTab,
) =>
  (roi.value?.total ?? 0) === 0
    ? "Price data will appear after the next store sync."
    : `No ${tab} games with playtime to rank.`;

const roiTotalPages = (roi: UseResourceResult<CostRoiPage>) =>
  Math.max(
    1,
    Math.ceil(
      (roi.value?.total ?? 0) / (roi.value?.pageSize ?? COST_ROI_PAGE_SIZE),
    ),
  );

export const CostView = (props: Record<string, unknown>) => {
  const {
    summary,
    bestRoi,
    worstRoi,
    bestTab,
    setBestTab,
    worstTab,
    setWorstTab,
    bestPage,
    setBestPage,
    worstPage,
    setWorstPage,
  } = props as CostViewProps;

  const s = summary.value;
  const currency = s?.currency || "USD";

  return (
    <>
      <PageHeader
        title="Cost Analytics"
        description="Estimate-only library value from store / ITAD prices — not what you spent. Steam does not expose purchase history; we never ask you to enter prices."
      />

      <ResourceStatus
        failed={summary.failed}
        empty={summary.empty}
        loading={<SkeletonStatGrid count={4} />}
        error={dangerEmpty("Could not load cost summary.")}
      >
        {s ? (
          <>
            <CostSummaryStats summary={s} />
            <CostMixCharts summary={s} />
          </>
        ) : null}
      </ResourceStatus>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Best value (lowest cost/hour)
          </h2>
          <ValueTabs value={bestTab} onChange={setBestTab} />
        </div>
        <ResourceStatus
          failed={bestRoi.failed}
          empty={bestRoi.empty}
          loading={<SkeletonListRows />}
          error={dangerEmpty("Could not load best value rankings.")}
        >
          <>
            <RoiList
              rows={bestRoi.value?.items ?? []}
              currency={currency}
              emptyMessage={roiEmptyMessage(bestRoi, bestTab)}
            />
            <RoiPagination
              page={bestPage}
              totalPages={roiTotalPages(bestRoi)}
              onPageChange={setBestPage}
            />
          </>
        </ResourceStatus>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Least value (highest cost/hour)
          </h2>
          <ValueTabs value={worstTab} onChange={setWorstTab} />
        </div>
        <ResourceStatus
          failed={worstRoi.failed}
          empty={worstRoi.empty}
          loading={<SkeletonListRows />}
          error={dangerEmpty("Could not load least value rankings.")}
        >
          <>
            <RoiList
              rows={worstRoi.value?.items ?? []}
              currency={currency}
              emptyMessage={roiEmptyMessage(worstRoi, worstTab)}
            />
            <RoiPagination
              page={worstPage}
              totalPages={roiTotalPages(worstRoi)}
              onPageChange={setWorstPage}
            />
          </>
        </ResourceStatus>
      </section>
    </>
  );
};
