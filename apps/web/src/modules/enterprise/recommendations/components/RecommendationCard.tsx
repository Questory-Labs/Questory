"use client";

import { HatchShadow } from "@/components/HatchShadow";
import styles from "../recommendations.module.css";
import { KIND_LABELS } from "../enterprise.recommendations.constants";
import type { RecommendationCardProps } from "../enterprise.recommendations.types";

export const RecommendationCard = ({
  item,
  vote,
  dismissed,
  onFeedback,
}: RecommendationCardProps) => {
  const portrait =
    item.kind === "movie" || item.kind === "show" || item.kind === "manga";
  const extra = item.kind === "external" || item.kind === "lifestyle";
  const canVote = Boolean(item.itemKey) && !extra;
  const badge = KIND_LABELS[item.kind];
  return (
    <article className={styles.cardWrap} data-dismissed={dismissed}>
      <HatchShadow size="sm" faceClassName={`panel ${styles.card}`}>
        <div className={styles.cardImageWrap} data-portrait={portrait}>
          {item.imageUrl ? (
            // Arbitrary external hosts (Steam CDN, TMDB, CAA) — plain img on purpose.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.cardImage}
              src={item.imageUrl}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className={styles.cardImageFallback} aria-hidden>
              {item.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className={styles.kindBadge}>{badge}</span>
        </div>
        <div className={styles.cardBody}>
          <h3 className={styles.cardName}>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.name}
              </a>
            ) : (
              item.name
            )}
          </h3>
          <div className={styles.scoreRow}>
            <div className={styles.scoreTrack}>
              <div
                className={styles.scoreFill}
                style={{ width: `${Math.round(item.score * 100)}%` }}
              />
            </div>
            <span className={styles.scoreValue}>
              {Math.round(item.score * 100)}
            </span>
          </div>
          {item.blurb ? (
            <p className={styles.blurb}>{item.blurb}</p>
          ) : (
            item.reasons.length > 0 && (
              <ul className={styles.reasons}>
                {item.reasons.map((reason) => (
                  <li key={reason} className={styles.reason}>
                    {reason}
                  </li>
                ))}
              </ul>
            )
          )}
          {canVote && (
            <div className={styles.feedbackRow}>
              <button
                type="button"
                className={styles.feedbackBtn}
                data-active={vote === "like"}
                aria-label={`Like ${item.name}`}
                title="More like this"
                onClick={() => onFeedback(item, "like")}
              >
                👍
              </button>
              <button
                type="button"
                className={styles.feedbackBtn}
                data-active={vote === "dislike"}
                aria-label={`Dislike ${item.name}`}
                title="Less like this"
                onClick={() => onFeedback(item, "dislike")}
              >
                👎
              </button>
              <button
                type="button"
                className={styles.feedbackBtn}
                aria-label={`Dismiss ${item.name}`}
                title="Not now"
                onClick={() => onFeedback(item, "dismiss")}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </HatchShadow>
    </article>
  );
};
