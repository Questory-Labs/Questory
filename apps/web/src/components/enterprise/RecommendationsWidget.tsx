"use client";

import { useQuery } from "@questorylabs/qhttp/react";
import { fetchRecommendations } from "@/lib/enterprise-api";
import styles from "./recommendations.module.css";

/** Compact top-N strip, e.g. for the dashboard. */
export function RecommendationsWidget({ limit = 3 }: { limit?: number }) {
  const recs = useQuery({
    queryKey: ["enterprise-recommendations-widget", limit],
    queryFn: () => fetchRecommendations({ limit }),
    staleTime: 60_000,
    retry: 1,
  });

  if (!recs.data?.available || recs.data.items.length === 0) return null;

  return (
    <div className={styles.widget}>
      {recs.data.items.map((item) => (
        <div
          key={`${item.kind}:${item.gameId ?? item.titleId ?? item.artistId ?? item.name}`}
          className={styles.widgetRow}
        >
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.widgetThumb}
              src={item.imageUrl}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className={styles.widgetThumb} aria-hidden />
          )}
          <div style={{ minWidth: 0 }}>
            <div className={styles.widgetName}>{item.name}</div>
            {item.reasons[0] && (
              <div className={styles.widgetReason}>{item.reasons[0]}</div>
            )}
          </div>
          <span className={styles.widgetKind}>{item.kind}</span>
        </div>
      ))}
    </div>
  );
}
