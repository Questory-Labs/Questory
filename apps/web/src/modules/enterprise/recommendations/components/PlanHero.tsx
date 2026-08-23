"use client";

import type { Plan, RecommendationItem } from "@/lib/enterprise-types";
import styles from "../recommendations.module.css";

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
  return (
    <section className={styles.plan} aria-label="Tonight's plan">
      <h3 className={styles.planTitle}>{plan.title}</h3>
      <ol className={styles.planSteps}>
        {plan.steps.map((step, i) => {
          const item =
            step.itemIndex != null ? items[step.itemIndex] : undefined;
          return (
            <li key={i} className={styles.planStep}>
              <span className={styles.planIndex}>{i + 1}</span>
              <span>
                {step.note}
                {item && <span className={styles.planItem}> — {item.name}</span>}
              </span>
            </li>
          );
        })}
        {onRecurate && (
          <li className={styles.planStep}>
            <span className={styles.planIndex}>{plan.steps.length + 1}</span>
            <button
              type="button"
              className={styles.planRecurate}
              onClick={onRecurate}
              disabled={busy}
            >
              {busy ? "Re-curating…" : "Not vibing? Re-curate for a fresh plan"}
            </button>
          </li>
        )}
      </ol>
    </section>
  );
}
