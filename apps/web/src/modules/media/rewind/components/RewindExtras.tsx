"use client";

import type { ReactNode } from "react";
import type {
  RewindCommonExtras,
  RewindMonthBucket,
  RewindTopItem,
} from "@questorylabs/shared";
import { previousRewindPeriod } from "@questorylabs/shared";
import { Panel } from "@questorylabs/ui";
import { RewindStatCard } from "./RewindStatCard";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const dayLabel = (date: string): string => {
  const [, m, d] = date.split("-");
  const month = MONTH_SHORT[Number(m) - 1];
  return month && d ? `${month} ${Number(d)}` : date;
};

const bucketLabel = (key: string): string => {
  const parts = key.split("-");
  if (parts.length === 3) return dayLabel(key);
  return MONTH_SHORT[Number(parts[1]) - 1] ?? key;
};

const periodLabel = (period: string): string => {
  const [y, m] = period.split("-");
  if (!m) return y ?? period;
  return `${MONTH_SHORT[Number(m) - 1] ?? m} ${y}`;
};

const priorLabel = (period: string): string => {
  try {
    return periodLabel(previousRewindPeriod(period));
  } catch {
    return "last period";
  }
};

export const RewindArc = ({
  buckets,
  unitLabel,
  formatCount = (n) => n.toLocaleString(),
}: {
  buckets: RewindMonthBucket[];
  unitLabel: string;
  formatCount?: (n: number) => string;
}) => {
  const max = Math.max(0, ...buckets.map((b) => b.count));
  if (max === 0 || buckets.length < 2) return null;
  const peak = buckets.find((b) => b.count === max)!;
  const daily = peak.month.split("-").length === 3;
  const width = 100 / buckets.length;
  return (
    <Panel className="p-5">
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <h3 className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider">
          {daily ? "Day by Day" : "Month by Month"}
        </h3>
        <p className="text-xs text-[var(--faint)]">
          Peak {bucketLabel(peak.month)}: {formatCount(peak.count)} {unitLabel}
          {peak.topItem ? ` · mostly ${peak.topItem}` : ""}
        </p>
      </div>
      <svg
        role="img"
        aria-label={`${daily ? "Daily" : "Monthly"} ${unitLabel}, peak ${bucketLabel(peak.month)}`}
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="w-full h-24"
      >
        {buckets.map((b, i) => {
          const h = (b.count / max) * 38;
          return (
            <rect
              key={b.month}
              x={i * width + width * 0.15}
              y={40 - h}
              width={width * 0.7}
              height={Math.max(h, b.count > 0 ? 0.8 : 0)}
              rx={0.6}
              fill={b === peak ? "var(--accent)" : "var(--line-strong)"}
            >
              <title>
                {`${bucketLabel(b.month)}: ${formatCount(b.count)} ${unitLabel}${b.topItem ? ` (${b.topItem})` : ""}`}
              </title>
            </rect>
          );
        })}
      </svg>
      {!daily ? (
        <div className="grid text-[10px] text-[var(--faint)] mt-1" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>
          {buckets.map((b) => (
            <span key={b.month} className="text-center">
              {bucketLabel(b.month).charAt(0)}
            </span>
          ))}
        </div>
      ) : null}
    </Panel>
  );
};

export const RewindNamedList = ({
  title,
  items,
  detail,
}: {
  title: string;
  items: RewindTopItem[] | undefined;
  detail: (item: RewindTopItem) => string;
}) => {
  if (!items?.length) return null;
  return (
    <Panel className="p-5 h-full">
      <h3 className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider mb-4">
        {title}
      </h3>
      <ul className="space-y-3">
        {items.slice(0, 5).map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3">
            <span className="text-[var(--ink)] truncate">{item.name}</span>
            <span className="text-[var(--muted)] font-mono text-sm shrink-0">
              {detail(item)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
};

export const RewindExtras = ({
  stats,
  period,
  unitLabel,
  formatCount = (n) => n.toLocaleString(),
}: {
  stats: RewindCommonExtras;
  period: string;
  unitLabel: string;
  formatCount?: (n: number) => string;
}) => {
  const prior = stats.prior?.coverage ? stats.prior : undefined;
  const tiles: ReactNode[] = [];
  if ((stats.longestStreakDays ?? 0) >= 2) {
    tiles.push(
      <RewindStatCard
        key="streak"
        title="Longest Streak"
        value={`${stats.longestStreakDays} days`}
        subtitle={stats.activeDays ? `${stats.activeDays} active days` : undefined}
      />,
    );
  }
  if (stats.busiestDay && stats.busiestDay.count > 0) {
    tiles.push(
      <RewindStatCard
        key="busiest"
        title="Busiest Day"
        value={dayLabel(stats.busiestDay.date)}
        subtitle={`${formatCount(stats.busiestDay.count)} ${unitLabel}`}
      />,
    );
  }
  if (prior && prior.deltaPct !== null) {
    const sign = prior.deltaPct > 0 ? "+" : "";
    tiles.push(
      <RewindStatCard
        key="prior"
        title={`vs ${priorLabel(period)}`}
        value={`${sign}${prior.deltaPct}%`}
        subtitle={`${prior.newItems} new, ${prior.returningItems} carried over`}
      />,
    );
  }
  if ((stats.longestGapDays ?? 0) >= 3) {
    tiles.push(
      <RewindStatCard
        key="gap"
        title="Longest Break"
        value={`${stats.longestGapDays} days`}
      />,
    );
  }

  const faded = prior ? stats.droppedOff : undefined;

  if (!tiles.length && !stats.monthly?.length && !faded?.length) return null;
  return (
    <div className="space-y-4" data-testid="rewind-extras">
      {tiles.length ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{tiles}</div>
      ) : null}
      {stats.monthly?.length ? (
        <RewindArc buckets={stats.monthly} unitLabel={unitLabel} formatCount={formatCount} />
      ) : null}
      {faded?.length ? (
        <RewindNamedList
          title={`Faded Out Since ${priorLabel(period)}`}
          items={faded}
          detail={(item) => `${formatCount(item.count)} ${unitLabel} then`}
        />
      ) : null}
    </div>
  );
};
