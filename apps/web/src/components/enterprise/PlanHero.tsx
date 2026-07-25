"use client";

import type { Plan, RecommendationItem } from "@/lib/enterprise-types";
import styles from "./recommendations.module.css";

/** "Tonight's plan" hero card: the Composer's cross-domain session. */
export function PlanHero({
  plan,
  items,
}: {
  plan: Plan;
  items: RecommendationItem[];
}) {
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
      </ol>
    </section>
  );
}
