"use client";

import Link from "next/link";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { ListPager } from "@/components/ListPager";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import {
  OverflowMarquee,
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonListRows,
  StateMessage,
} from "@/components/ui";
import { formatShare } from "@/lib/music";
import { MUSIC_CHARTS_PAGE_SIZE } from "@/lib/pagination";
import { CHART_KINDS, RANGE_LABELS } from "./music.charts.constants";
import type { MusicChartsViewProps } from "./music.charts.types";
import { entityHref } from "./music.charts.utils";

export const MusicChartsView = (props: Record<string, unknown>) => {
  const {
    kind,
    setKind,
    range,
    onRangeChange,
    page,
    setPage,
    tops,
    years,
    services,
  } = props as MusicChartsViewProps;

  const periodListens = tops.value?.periodListens ?? 0;
  const items = tops.value?.items ?? [];
  const total = tops.value?.total ?? 0;
  const pageSize = tops.value?.pageSize ?? MUSIC_CHARTS_PAGE_SIZE;
  const rankOffset = (page - 1) * pageSize;
  const rangeLabel = RANGE_LABELS[range];

  return (
    <>
      <PageHeader
        title="Top charts"
        description={total > 0 ? `${rangeLabel} · ${total} ${kind}` : rangeLabel}
        actions={<MusicRangePicker value={range} onChange={onRangeChange} />}
      />

      <div
        className="mb-6 flex flex-wrap gap-1 border-b border-[var(--line)] pb-3"
        role="tablist"
        aria-label="Chart type"
      >
        {CHART_KINDS.map((k) => {
          const active = k.value === kind;
          return (
            <button
              key={k.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setKind(k.value)}
              className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
                active
                  ? "text-[var(--ink)] underline decoration-[var(--accent)] underline-offset-8"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      <ResourceStatus
        failed={tops.failed}
        empty={tops.empty}
        loading={<SkeletonListRows />}
        error={<StateMessage variant="error">Could not load charts.</StateMessage>}
      >
        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No listens in this range.</p>
        ) : (
          <>
            <ol className="space-y-2">
              {items.map((item, i) => {
                const href = entityHref(kind, item.id);
                const name = item.name || item.title || "—";
                const row = (
                  <>
                    <span className="w-6 shrink-0 font-mono text-[var(--faint)]">
                      {rankOffset + i + 1}.
                    </span>
                    {(kind === "artists" ||
                      kind === "albums" ||
                      kind === "tracks") && (
                      <MusicCover src={item.imageUrl} alt="" size="sm" />
                    )}
                    <OverflowMarquee className="flex-1 text-[var(--ink)]">
                      {name}
                      {item.artistName ? (
                        <span className="text-[var(--muted)]">
                          {" "}
                          · {item.artistName}
                        </span>
                      ) : null}
                    </OverflowMarquee>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--faint)]">
                      {formatShare(item.count, periodListens)}
                    </span>
                    <span className="w-10 shrink-0 text-right font-mono text-[11px] text-[var(--muted)]">
                      {item.count}
                    </span>
                  </>
                );
                return (
                  <li key={item.id}>
                    {href ? (
                      <Link
                        href={href}
                        className="flex items-center gap-3 border-b border-[var(--line)] py-2 text-sm hover:bg-[var(--bg-1)]"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 border-b border-[var(--line)] py-2 text-sm">
                        {row}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <ListPager
              page={page}
              total={total}
              pageSize={pageSize}
              disabled={tops.refreshing}
              onPageChange={setPage}
            />
          </>
        )}
      </ResourceStatus>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <ChartStatus
          failed={years.failed}
          empty={years.empty}
          title="Release years"
          error="Could not load release years."
        >
          <Panel className="p-4">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Release years
            </h2>
            <ul className="mt-3 space-y-1.5">
              {(years.value?.items || []).map((item) => (
                <li
                  key={item.key}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-[var(--ink)]">{item.label}</span>
                  <span className="font-mono text-[11px] text-[var(--faint)]">
                    {item.count}
                    {years.value
                      ? ` · ${formatShare(item.count, years.value.periodListens)}`
                      : ""}
                  </span>
                </li>
              ))}
              {(years.value?.items || []).length === 0 ? (
                <li className="text-sm text-[var(--muted)]">No year data yet.</li>
              ) : null}
            </ul>
          </Panel>
        </ChartStatus>

        <ChartStatus
          failed={services.failed}
          empty={services.empty}
          title="Sources"
          error="Could not load sources."
        >
          <Panel className="p-4">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Sources
            </h2>
            <ul className="mt-3 space-y-1.5">
              {(services.value?.items || []).map((item) => (
                <li
                  key={item.key}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-[var(--ink)]">{item.label}</span>
                  <span className="font-mono text-[11px] text-[var(--faint)]">
                    {item.count}
                    {services.value
                      ? ` · ${formatShare(item.count, services.value.periodListens)}`
                      : ""}
                  </span>
                </li>
              ))}
              {(services.value?.items || []).length === 0 ? (
                <li className="text-sm text-[var(--muted)]">
                  No source metadata yet.
                </li>
              ) : null}
            </ul>
          </Panel>
        </ChartStatus>
      </div>
    </>
  );
};
