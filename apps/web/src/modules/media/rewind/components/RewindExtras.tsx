import type { RewindCommonExtras } from "@questorylabs/shared";
import type { RewindRankList, RewindStatTile } from "../media.rewind.summary.types";
import { dayLabel, formatCount as defaultFormat, priorLabel, signedPct } from "../media.rewind.format";

export const rewindExtrasTiles = (
  stats: RewindCommonExtras,
  period: string,
  unitLabel: string,
  formatCount: (n: number) => string = defaultFormat,
): RewindStatTile[] => {
  const prior = stats.prior?.coverage ? stats.prior : undefined;
  const tiles: RewindStatTile[] = [];
  if ((stats.longestStreakDays ?? 0) >= 2) {
    tiles.push({
      key: "streak",
      label: "Longest streak",
      value: `${stats.longestStreakDays} days`,
      note: stats.activeDays ? `${stats.activeDays} active days` : undefined,
    });
  }
  if (stats.busiestDay && stats.busiestDay.count > 0) {
    tiles.push({
      key: "busiest",
      label: "Busiest day",
      value: dayLabel(stats.busiestDay.date),
      note: `${formatCount(stats.busiestDay.count)} ${unitLabel}`,
    });
  }
  if (prior && prior.deltaPct !== null) {
    tiles.push({
      key: "prior",
      label: `vs ${priorLabel(period)}`,
      value: signedPct(prior.deltaPct),
      note: `${prior.newItems} new, ${prior.returningItems} carried over`,
    });
  }
  if ((stats.longestGapDays ?? 0) >= 3) {
    tiles.push({ key: "gap", label: "Longest break", value: `${stats.longestGapDays} days` });
  }
  return tiles;
};

export const rewindFadedList = (
  stats: RewindCommonExtras,
  period: string,
  unitLabel: string,
  formatCount: (n: number) => string = defaultFormat,
): RewindRankList | null => {
  const faded = stats.prior?.coverage ? stats.droppedOff : undefined;
  if (!faded?.length) return null;
  return {
    key: "faded",
    title: `Faded out since ${priorLabel(period)}`,
    items: faded.map((item) => ({
      id: item.id,
      name: item.name,
      value: `${formatCount(item.count)} ${unitLabel} then`,
    })),
  };
};
