"use client";

import { ListPager } from "@/components/ListPager";
import { COST_ROI_PAGE_SIZE } from "@/lib/pagination";
import type { CostRoiPage } from "@questorylabs/shared";
import {
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonListRows,
  SkeletonStatGrid,
} from "@questorylabs/ui";
import { CostGameList } from "./components/CostGameList";
import { CostHero } from "./components/CostHero";
import { CostIdleList } from "./components/CostIdleList";
import { CostRanking } from "./components/CostRanking";
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
  } = props as CostViewProps;

  const s = summary.value;
  const currency = s?.currency || "USD";
  const roiPage: CostRoiPage | undefined = roi.value;
  const rankOffset =
    ((roiPage?.page ?? page) - 1) * (roiPage?.pageSize ?? COST_ROI_PAGE_SIZE);

  return (
    <>
      <PageHeader
        size="sm"
        eyebrow="Estimates"
        title="Library cost"
        description="What the shelf is worth at current prices, and which games actually pay off."
      />

      <ResourceStatus
        failed={summary.failed}
        empty={summary.empty}
        loading={<SkeletonStatGrid count={4} />}
        error={dangerEmpty("Could not load cost summary.")}
      >
        {s ? <CostHero summary={s} /> : null}
      </ResourceStatus>

      {s ? <CostIdleList summary={s} /> : null}

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
    </>
  );
};
