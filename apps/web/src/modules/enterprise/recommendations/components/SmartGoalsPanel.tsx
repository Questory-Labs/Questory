"use client";

import { useState } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { fetchSmartGoals } from "@/lib/enterprise-api";
import { HatchShadow } from "@/components/HatchShadow";
import { StateMessage } from "@/components/ui";
import styles from "../recommendations.module.css";

const KIND_LABELS: Record<string, string> = {
  game: "Game",
  artist: "Artist",
  track: "Track",
  movie: "Movie",
  show: "Show",
  manga: "Manga",
};

export const SmartGoalsPanel = () => {
  const [timeframe, setTimeframe] = useState("this month");
  const [targetCount, setTargetCount] = useState(5);

  const goals = useResource({
    id: ["enterprise-goals", timeframe, targetCount],
    load: () => fetchSmartGoals({ timeframe, targetCount }),
    freshFor: 60_000,
  });

  return (
    <section>
      <div className={styles.worldStrip}>
        <span>Backlog killer</span>
        <div className={styles.goalsControls}>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className={styles.goalsSelect}
            aria-label="Goal timeframe"
          >
            <option value="this week">This week</option>
            <option value="this month">This month</option>
            <option value="this year">This year</option>
          </select>
          <select
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value))}
            className={styles.goalsSelect}
            aria-label="Target count"
          >
            <option value={1}>1 item</option>
            <option value={3}>3 items</option>
            <option value={5}>5 items</option>
            <option value={10}>10 items</option>
          </select>
        </div>
      </div>

      {goals.empty ? (
        <StateMessage variant="loading" className="mt-0">
          Loading your backlog goals…
        </StateMessage>
      ) : null}

      {goals.failed ? (
        <StateMessage variant="error" className="mt-0">
          {(goals.error as Error).message}
        </StateMessage>
      ) : null}

      {goals.value ? (
        <div className={styles.grid}>
          {goals.value.suggestions.map((suggestion) => (
            <article key={suggestion.itemKey} className={styles.cardWrap}>
              <HatchShadow size="sm" faceClassName={`panel ${styles.card}`}>
                <div className={styles.cardBody}>
                  <span className={styles.kindBadge} data-static>
                    {KIND_LABELS[suggestion.kind] ?? suggestion.kind}
                  </span>
                  <h3 className={styles.cardName}>{suggestion.name}</h3>
                  {suggestion.estimatedTimeMinutes != null ? (
                    <p className={styles.goalsMeta}>
                      ~{Math.round((suggestion.estimatedTimeMinutes / 60) * 10) / 10}h
                    </p>
                  ) : null}
                  <p className={styles.blurb}>{suggestion.reason}</p>
                </div>
              </HatchShadow>
            </article>
          ))}
          {goals.value.suggestions.length === 0 ? (
            <p className={styles.message}>Backlog looks clear — nice work.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
