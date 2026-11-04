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
    <section
      aria-labelledby="cost-rank"
      className="panel q-in px-2 pb-2 pt-[18px]"
      style={{ ["--i" as string]: 4 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-3">
        <div className="min-w-0">
          <h2 id="cost-rank" className="text-[26px] font-light tracking-[-0.02em]">
            Ranking, <em className="font-serif font-normal text-[var(--muted)]">per hour</em>
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-[var(--muted)]">
            {copy.title} · {copy.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
      <div className="mt-2.5">{children}</div>
    </section>
  );
};
