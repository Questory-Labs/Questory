"use client";

import { useState } from "react";
import type { CostSummary } from "@questorylabs/shared";
import { COST_SHARE_TOP_N } from "../steam.cost.constants";
import { CostShareList } from "./CostShareList";

type ShareGroup = "genre" | "publisher";

export const CostValueShares = ({ summary }: { summary: CostSummary }) => {
  const currency = summary.currency || "USD";
  const genres = (summary.byGenre ?? [])
    .slice(0, COST_SHARE_TOP_N)
    .map((row) => ({ name: row.genre, amount: row.amount }));
  const publishers = (summary.byPublisher ?? [])
    .slice(0, COST_SHARE_TOP_N)
    .map((row) => ({ name: row.publisher, amount: row.amount }));
  const [group, setGroup] = useState<ShareGroup>(genres.length ? "genre" : "publisher");

  if (genres.length === 0 && publishers.length === 0) return null;
  const rows = group === "genre" ? genres : publishers;

  return (
    <section
      aria-labelledby="cost-shares"
      className="panel q-in min-w-0 flex-[1_1_420px] px-[22px] py-5"
      style={{ ["--i" as string]: 2 }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="cost-shares" className="text-[17px] font-normal">
          Value by {group}
        </h2>
        <label className="flex min-h-9 items-center rounded-full border border-white/[0.08] bg-black/25 px-3">
          <span className="sr-only">Group by</span>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as ShareGroup)}
            className="border-0 bg-transparent text-[13px] text-[var(--ink)] outline-none"
          >
            {genres.length ? <option value="genre">Genre</option> : null}
            {publishers.length ? <option value="publisher">Publisher</option> : null}
          </select>
        </label>
      </div>
      <CostShareList rows={rows} currency={currency} />
    </section>
  );
};
