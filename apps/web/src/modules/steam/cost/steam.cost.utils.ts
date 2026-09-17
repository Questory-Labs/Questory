import type { CostRoiValueFilter } from "@questorylabs/shared";

export const roiEmptyMessage = (
  total: number,
  tab: CostRoiValueFilter,
) =>
  total === 0
    ? "Price data will appear after the next store sync."
    : tab === "all"
      ? "No games with playtime to rank."
      : `No ${tab} games with playtime to rank.`;

export const costRowKey = (row: {
  gameId?: string;
  appId: number | null;
  name: string;
}) => row.gameId || (row.appId != null ? String(row.appId) : row.name);

export const costRowHref = (row: { gameId?: string }) =>
  row.gameId ? `/library/${row.gameId}` : null;

export const costBarPct = (amount: number, max: number) => {
  if (amount <= 0 || max <= 0) return 0;
  return Math.max(4, Math.round((amount / max) * 100));
};
