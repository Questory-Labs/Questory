"use client";

import type { Plan, RecommendationItem } from "@/lib/enterprise-types";
import { DOMAIN_COLOR } from "../enterprise.recommendations.constants";

/** "Tonight's plan" hero card. */
export const PlanHero = ({
  plan,
  items,
  onRecurate,
  busy,
}: {
  plan: Plan;
  items: RecommendationItem[];
  /** Force a fresh curation for the same mood. */
  onRecurate?: () => void;
  busy?: boolean;
}) => {
  if (plan.steps.length === 0) return null;
  const stepItems = plan.steps.map((step) =>
    step.itemIndex != null ? items[step.itemIndex] : undefined,
  );
  return (
    <section className="min-w-0 flex-[1_1_380px]" aria-label="Tonight's plan">
      <p className="label-mono text-[10px] text-[var(--faint)]">Tonight&apos;s plan</p>
      <h2 className="mt-2 text-[34px] font-light leading-[1.05] tracking-[-0.03em]">
        {plan.title}
      </h2>
      <ol className="mt-3 space-y-1.5 text-[var(--muted)]">
        {plan.steps.map((step, i) => {
          const item = stepItems[i];
          return (
            <li key={i} className="flex gap-3">
              <span className="w-4 shrink-0 font-mono text-[11px] leading-6 text-[var(--faint)]">
                {i + 1}
              </span>
              <span>
                {step.note}
                {item && <span className="text-[var(--ink)]"> — {item.name}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-[18px] flex items-center gap-1.5" aria-hidden="true">
        {stepItems.map((item, i) => {
          const color = item ? DOMAIN_COLOR[item.domain] : "rgba(255,255,255,0.08)";
          return (
            <span
              key={i}
              className="h-1 flex-1 rounded-sm"
              style={{
                background: color,
                boxShadow: item ? `0 0 10px ${color}` : undefined,
              }}
            />
          );
        })}
      </div>
      {onRecurate && (
        <button
          type="button"
          className="mt-4 min-h-9 rounded-full border border-white/[0.12] px-3.5 text-[13px] text-[var(--ink)] transition-transform duration-500 hover:-translate-y-0.5 disabled:opacity-50"
          onClick={onRecurate}
          disabled={busy}
        >
          {busy ? "Re-curating…" : "Not vibing? Re-curate for a fresh plan"}
        </button>
      )}
    </section>
  );
};
