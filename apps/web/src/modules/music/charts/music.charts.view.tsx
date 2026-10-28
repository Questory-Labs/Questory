"use client";

import { ListPager } from "@/components/ListPager";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import {
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonListRows,
  StateMessage,
} from "@/components/ui";
import { MUSIC_CHARTS_PAGE_SIZE } from "@/lib/pagination";
import { ChartBreakdowns } from "./components/ChartBreakdowns";
import { ChartInsights } from "./components/ChartInsights";
import { ChartRows } from "./components/ChartRows";
import { ChartTabs } from "./components/ChartTabs";
import { CHART_KINDS, RANGE_LABELS } from "./music.charts.constants";
import type { MusicChartsViewProps } from "./music.charts.types";

export const MusicChartsView = (props: Record<string, unknown>) => {
  const {
    kind,
    setKind,
    range,
    onRangeChange,
    page,
    setPage,
    tops,
    movers,
    years,
    services,
  } = props as MusicChartsViewProps;

  const periodListens = tops.value?.periodListens ?? 0;
  const items = tops.value?.items ?? [];
  const total = tops.value?.total ?? 0;
  const pageSize = tops.value?.pageSize ?? MUSIC_CHARTS_PAGE_SIZE;
  const rankOffset = (page - 1) * pageSize;
  const rangeLabel = RANGE_LABELS[range];
  const kindLabel = CHART_KINDS.find((k) => k.value === kind)?.label ?? kind;

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        size="sm"
        eyebrow={`Top charts · ${rangeLabel}`}
        title={
          tops.value ? (
            <>
              {periodListens.toLocaleString()} listens,{" "}
              <em className="font-serif font-normal text-[#f0c4cf]">ranked</em>
            </>
          ) : (
            "Top charts"
          )
        }
        description={total > 0 ? `${rangeLabel} · ${total} ${kind}` : rangeLabel}
        actions={<MusicRangePicker value={range} onChange={onRangeChange} />}
      />

      <ChartTabs kind={kind} onChange={setKind} />

      <div className="flex flex-wrap items-start gap-3.5">
        <Panel
          wrapperClassName="q-in min-w-0 flex-[999_1_560px] [--i:2]"
          className="px-1.5 py-2.5"
        >
          <section aria-label={`${kindLabel} chart`}>
            <ResourceStatus
              failed={tops.failed}
              empty={tops.empty}
              loading={<SkeletonListRows />}
              error={<StateMessage variant="error">Could not load charts.</StateMessage>}
            >
              {items.length === 0 ? (
                <p className="px-3 py-2 text-sm text-[var(--muted)]">
                  No listens in this range.
                </p>
              ) : (
                <>
                  <ChartRows
                    kind={kind}
                    items={items}
                    rankOffset={rankOffset}
                    periodListens={periodListens}
                  />
                  <div className="px-3">
                    <ListPager
                      page={page}
                      total={total}
                      pageSize={pageSize}
                      disabled={tops.refreshing}
                      onPageChange={setPage}
                    />
                  </div>
                </>
              )}
            </ResourceStatus>
          </section>
        </Panel>
        <ChartInsights movers={movers} kind={kind} range={range} />
      </div>

      <ChartBreakdowns years={years} services={services} />
    </div>
  );
};
