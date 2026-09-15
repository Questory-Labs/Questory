"use client";

import type { CostRoiSort, CostRoiValueFilter } from "@questorylabs/shared";
import type { ReactNode } from "react";
import {
  COST_SORT_COPY,
  COST_SORT_OPTIONS,
  COST_VALUE_OPTIONS,
} from "../steam.cost.constants";
import { CostFilterGroup } from "./CostFilterGroup";

export const CostRanking = ({
  sort,
  setSort,
  valueTab,
  setValueTab,
  children,
}: {
  sort: CostRoiSort;
  setSort: (sort: CostRoiSort) => void;
  valueTab: CostRoiValueFilter;
  setValueTab: (tab: CostRoiValueFilter) => void;
  children: ReactNode;
}) => {
  const copy = COST_SORT_COPY[sort];

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
            {copy.description}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
          <CostFilterGroup
            value={sort}
            onChange={(id) => setSort(id as CostRoiSort)}
            options={COST_SORT_OPTIONS}
            ariaLabel="Ranking order"
            variant="tabs"
          />
          <CostFilterGroup
            value={valueTab}
            onChange={(id) => setValueTab(id as CostRoiValueFilter)}
            options={COST_VALUE_OPTIONS}
            ariaLabel="Price filter"
            variant="chips"
          />
        </div>
      </div>
      {children}
    </section>
  );
};
