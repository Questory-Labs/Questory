"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import type {
  CostRoiPage,
  CostRoiSort,
  CostRoiValueFilter,
  CostSummary,
} from "@questorylabs/shared";
import { cloneElements } from "@questorylabs/ui";
import { api } from "@/lib/api";
import { COST_ROI_PAGE_SIZE } from "@/lib/pagination";

export const CostController = ({ children }: PropsWithChildren) => {
  const [sort, setSort] = useState<CostRoiSort>("best");
  const [valueTab, setValueTab] = useState<CostRoiValueFilter>("paid");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [sort, valueTab]);

  const summary = useResource({
    id: ["cost-summary"],
    load: () => api<CostSummary>("/cost/summary"),
  });
  const roi = useResource({
    id: ["cost-roi", sort, valueTab, page],
    load: () =>
      api<CostRoiPage>(
        `/cost/roi?sort=${sort}&value=${valueTab}&page=${page}&pageSize=${COST_ROI_PAGE_SIZE}`,
      ),
  });

  return cloneElements(children, {
    summary,
    roi,
    sort,
    setSort,
    valueTab,
    setValueTab,
    page,
    setPage,
  });
};
