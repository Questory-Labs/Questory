"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import type { CostRoiPage, CostSummary } from "@questorylabs/shared";
import { cloneElements } from "@questorylabs/ui";
import { api } from "@/lib/api";
import { COST_ROI_PAGE_SIZE } from "@/lib/pagination";
import type { ValueTab } from "./steam.cost.types";

export const CostController = ({ children }: PropsWithChildren) => {
  const [bestTab, setBestTab] = useState<ValueTab>("paid");
  const [worstTab, setWorstTab] = useState<ValueTab>("paid");
  const [bestPage, setBestPage] = useState(1);
  const [worstPage, setWorstPage] = useState(1);

  useEffect(() => {
    setBestPage(1);
  }, [bestTab]);

  useEffect(() => {
    setWorstPage(1);
  }, [worstTab]);

  const summary = useResource({
    id: ["cost-summary"],
    load: () => api<CostSummary>("/cost/summary"),
  });
  const bestRoi = useResource({
    id: ["cost-roi", "best", bestTab, bestPage],
    load: () =>
      api<CostRoiPage>(
        `/cost/roi?sort=best&value=${bestTab}&page=${bestPage}&pageSize=${COST_ROI_PAGE_SIZE}`,
      ),
  });
  const worstRoi = useResource({
    id: ["cost-roi", "worst", worstTab, worstPage],
    load: () =>
      api<CostRoiPage>(
        `/cost/roi?sort=worst&value=${worstTab}&page=${worstPage}&pageSize=${COST_ROI_PAGE_SIZE}`,
      ),
  });

  return cloneElements(children, {
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
  });
};
