import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  CostRoiPage,
  CostRoiSort,
  CostRoiValueFilter,
  CostSummary,
} from "@questorylabs/shared";

export type CostViewProps = {
  summary: UseResourceResult<CostSummary>;
  roi: UseResourceResult<CostRoiPage>;
  sort: CostRoiSort;
  setSort: (sort: CostRoiSort) => void;
  valueTab: CostRoiValueFilter;
  setValueTab: (tab: CostRoiValueFilter) => void;
  page: number;
  setPage: (page: number) => void;
};
