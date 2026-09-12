"use client";

import type { CostSummary } from "@questorylabs/shared";
import { Panel } from "@questorylabs/ui";
import { COST_SHARE_TOP_N } from "../steam.cost.constants";
import { CostShareList } from "./CostShareList";

export const CostValueShares = ({ summary }: { summary: CostSummary }) => {
  const currency = summary.currency || "USD";
  const genres = (summary.byGenre ?? [])
    .slice(0, COST_SHARE_TOP_N)
    .map((row) => ({ name: row.genre, amount: row.amount }));
  const publishers = (summary.byPublisher ?? [])
    .slice(0, COST_SHARE_TOP_N)
    .map((row) => ({ name: row.publisher, amount: row.amount }));

  if (genres.length === 0 && publishers.length === 0) return null;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {genres.length > 0 ? (
        <Panel variant="outline" className="p-4">
          <CostShareList title="Genre" rows={genres} currency={currency} />
        </Panel>
      ) : null}
      {publishers.length > 0 ? (
        <Panel variant="outline" className="p-4">
          <CostShareList
            title="Publisher"
            rows={publishers}
            currency={currency}
          />
        </Panel>
      ) : null}
    </div>
  );
};
