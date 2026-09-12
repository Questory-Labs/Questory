import type { CostRoiSort, CostRoiValueFilter } from "@questorylabs/shared";

/** Named share rows under the hero (genre / publisher). Long tails stay out. */
export const COST_SHARE_TOP_N = 6;

export const COST_SORT_OPTIONS: { id: CostRoiSort; label: string }[] = [
  { id: "best", label: "Best value" },
  { id: "worst", label: "Least value" },
];

export const COST_VALUE_OPTIONS: { id: CostRoiValueFilter; label: string }[] = [
  { id: "paid", label: "Paid" },
  { id: "free", label: "Free" },
  { id: "all", label: "All" },
];

export const COST_SORT_COPY: Record<
  CostRoiSort,
  { title: string; description: string }
> = {
  best: {
    title: "Ranked by cost / hour",
    description:
      "Lowest first — games whose estimated price stretched the furthest.",
  },
  worst: {
    title: "Ranked by cost / hour",
    description:
      "Highest first — priced games that barely got played.",
  },
};
