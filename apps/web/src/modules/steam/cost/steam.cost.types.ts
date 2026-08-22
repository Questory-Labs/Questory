import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { CostRoiPage, CostSummary } from "@questorylabs/shared";

export type ValueTab = "paid" | "free";

export type CostViewProps = {
  summary: UseResourceResult<CostSummary>;
  bestRoi: UseResourceResult<CostRoiPage>;
  worstRoi: UseResourceResult<CostRoiPage>;
  bestTab: ValueTab;
  setBestTab: (tab: ValueTab) => void;
  worstTab: ValueTab;
  setWorstTab: (tab: ValueTab) => void;
  bestPage: number;
  setBestPage: (page: number) => void;
  worstPage: number;
  setWorstPage: (page: number) => void;
};
