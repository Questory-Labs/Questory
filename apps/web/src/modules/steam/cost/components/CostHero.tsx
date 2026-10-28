"use client";

import { formatMoney } from "@/lib/money";
import type { CostSummary } from "@questorylabs/shared";
import { ProgressRing } from "@questorylabs/ui";

const tile = "rounded-[18px] border px-4 py-3.5";
const tileValue = "mt-2 text-[34px] font-extralight leading-none tracking-[-0.03em]";

export const CostHero = ({ summary }: { summary: CostSummary }) => {
  const currency = summary.currency || "USD";
  const money = (n: number | null | undefined) => formatMoney(n, currency);
  const priced = summary.pricedGameCount ?? 0;
  const librarySize = summary.librarySize ?? 0;
  const pricedShare = librarySize > 0 ? priced / librarySize : 0;

  return (
    <section
      aria-labelledby="cost-value"
      className="panel q-in relative flex flex-wrap items-end gap-7 overflow-hidden bg-[linear-gradient(160deg,rgba(210,210,214,0.16),rgba(255,255,255,0.016)_55%)] px-7 py-[26px]"
      style={{ ["--i" as string]: 1 }}
    >
      <span aria-hidden="true" className="dot-matrix q-twinkle absolute -right-[60px] -top-20 h-80 w-[480px] opacity-30" />
      <div className="relative flex-[1_1_300px]">
        <p id="cost-value" className="label-mono text-[var(--muted)]">
          Estimated library value
        </p>
        <p className="mt-2.5 text-[clamp(54px,6.4vw,88px)] font-extralight leading-[0.95] tracking-[-0.05em]">
          {money(summary.lifetimeAtCurrent)}
        </p>
        <p className="mt-3 max-w-xl text-sm text-[var(--muted)]">
          {summary.usingStoreEstimates
            ? "Store and ITAD prices, not purchase history."
            : "Recorded prices where you entered them, otherwise current store prices."}{" "}
          Lowest recorded {money(summary.lifetimeAtLowest)} · {priced} of {librarySize} games priced.
        </p>
      </div>
      <div className="relative flex items-center gap-3.5">
        <ProgressRing
          value={pricedShare}
          size={76}
          stroke={3}
          label={`${Math.round(pricedShare * 100)}% of games priced`}
        >
          <span className="text-[13px] font-light">{Math.round(pricedShare * 100)}%</span>
        </ProgressRing>
        <span className="text-[13px] text-[var(--muted)]">priced</span>
      </div>
      <dl className="relative grid flex-[2_1_420px] grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <div className={`${tile} border-white/[0.06] bg-black/25`}>
          <dt className="label-mono text-[var(--faint)]">Cost / hour</dt>
          <dd className={tileValue}>{money(summary.costPerHour)}</dd>
          <dd className="mt-1.5 text-xs text-[var(--muted)]">
            {summary.totalHours > 0
              ? `${summary.totalHours.toLocaleString()}h played`
              : "Based on current store prices"}
          </dd>
        </div>
        <div className={`${tile} border-[rgba(245,165,36,0.2)] bg-[rgba(245,165,36,0.06)]`}>
          <dt className="label-mono text-[var(--warn)]">Idle value</dt>
          <dd className={tileValue}>{money(summary.moneyWasted)}</dd>
          <dd className="mt-1.5 text-xs text-[var(--muted)]">
            {summary.neverPlayedCount} unplayed · {summary.underOneHourCount} under 1h
          </dd>
        </div>
        <div className={`${tile} border-white/[0.06] bg-black/25`}>
          <dt className="label-mono text-[var(--faint)]">Priced mix</dt>
          <dd className={tileValue}>{`${summary.paidGameCount ?? 0} paid`}</dd>
          <dd className="mt-1.5 text-xs text-[var(--muted)]">{`${summary.freeGameCount ?? 0} free`}</dd>
        </div>
      </dl>
    </section>
  );
};
