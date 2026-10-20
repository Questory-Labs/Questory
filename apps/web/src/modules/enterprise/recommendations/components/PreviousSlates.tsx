"use client";

import { useResource } from "@questorylabs/qhttp/react";
import { fetchRecommendationHistory } from "@/lib/enterprise-api";
import type {
  FeedbackAction,
  RecommendationHistorySlate,
} from "@/lib/enterprise-types";
import styles from "../recommendations.module.css";
import type { FeedbackTarget } from "../enterprise.recommendations.types";

export const HISTORY_RESOURCE_ID = ["enterprise-rec-history"] as const;

const servedLabel = (servedAt: number): string =>
  new Date(servedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export const PreviousSlates = ({
  currentKeys,
  votes,
  onFeedback,
}: {
  currentKeys: Set<string>;
  votes: Record<string, FeedbackAction>;
  onFeedback: (item: FeedbackTarget, action: FeedbackAction) => void;
}) => {
  const history = useResource({
    id: [...HISTORY_RESOURCE_ID],
    load: () => fetchRecommendationHistory(4),
    freshFor: 60_000,
    retries: 1,
  });

  const slates = (history.value?.slates ?? [])
    .filter((slate) => slate.source !== "recommend")
    .filter(
      (slate) => !slate.items.every((item) => currentKeys.has(item.itemKey)),
    )
    .slice(0, 3);
  if (slates.length === 0) return null;

  return (
    <section className={styles.libraryStrip} aria-label="Previously suggested">
      <h2 className={styles.libraryHeading}>Previously suggested</h2>
      <div className={styles.historyList}>
        {slates.map((slate) => (
          <SlateRow
            key={slate.slateId}
            slate={slate}
            votes={votes}
            onFeedback={onFeedback}
          />
        ))}
      </div>
    </section>
  );
};

const SlateRow = ({
  slate,
  votes,
  onFeedback,
}: {
  slate: RecommendationHistorySlate;
  votes: Record<string, FeedbackAction>;
  onFeedback: (item: FeedbackTarget, action: FeedbackAction) => void;
}) => (
  <div className={styles.historySlate}>
    <p className={styles.historyMeta}>
      {servedLabel(slate.servedAt)}
      {slate.ask ? ` · “${slate.ask}”` : ""}
    </p>
    <ul className={styles.historyItems}>
      {slate.items.map((item) => {
        const vote = votes[item.itemKey] ?? item.feedback ?? undefined;
        return (
          <li key={item.itemKey} className={styles.historyItem}>
            <span className={styles.historyName}>{item.name}</span>
            {item.why ? (
              <span className={styles.historyWhy}>{item.why}</span>
            ) : null}
            <span className={styles.historyActions}>
              <button
                type="button"
                className={styles.feedbackBtn}
                data-active={vote === "like"}
                aria-label={`Like ${item.name}`}
                title="More like this"
                onClick={() => onFeedback({ itemKey: item.itemKey }, "like")}
              >
                👍
              </button>
              <button
                type="button"
                className={styles.feedbackBtn}
                data-active={vote === "dislike"}
                aria-label={`Dislike ${item.name}`}
                title="Less like this"
                onClick={() => onFeedback({ itemKey: item.itemKey }, "dislike")}
              >
                👎
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);
